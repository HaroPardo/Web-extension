document.addEventListener('DOMContentLoaded', () => {
  const isPackaged = window.process?.resourcesPath !== undefined;
  
  // UI element references
  const closeBtn = document.getElementById('close-btn');
  const minimizeBtn = document.getElementById('minimize-btn');
  const pinBtn = document.getElementById('pin-btn');
  const minimizeOnBlurBtn = document.getElementById('minimize-on-blur-btn');
  const closeOnBlurBtn = document.getElementById('close-on-blur-btn');
  const webview = document.getElementById('whatsapp-tab');
  const resetBtn = document.getElementById('reset-session-btn');
  const statusMsg = document.getElementById('status-msg');
  const winAPI = window.electronAPI || null;  // Preload-safe access

  // State variables
  let isPinned = false;
  let blurMode = 'minimize';
  let qrCheckInterval = null;
  let qrCheckTimeout = null;

  // Initialize UI from persisted state
  const initFromStorage = async () => {
    if (!winAPI) return;
    try {
      isPinned = await winAPI.getPinStatus();
      blurMode = await winAPI.getBlurMode();
    } catch (e) {
      // si preload no responde, conservamos valores por defecto
      isPinned = !!isPinned;
      blurMode = blurMode || 'minimize';
    }
    updatePinButton();
    updateBlurModeButtons();
  };
  
  // Update pin button visual state (y persistir)
  const updatePinButton = () => {
    if (!pinBtn) return;
    pinBtn.textContent = isPinned ? '✅ Pinned' : '📌 Pin';
    pinBtn.classList.toggle('pinned', isPinned);
    winAPI?.setPinStatus?.(isPinned);
    // Si está pinned, ocultamos checkmarks en blur buttons
    updateBlurModeButtons();
  };

  // Render blur-mode buttons (asegura que solo uno tenga tick y respeta pinned)
  const updateBlurModeButtons = () => {
    if (!minimizeOnBlurBtn || !closeOnBlurBtn) return;

    // Reset labels (evita duplicar checkmarks)
    minimizeOnBlurBtn.classList.remove('active');
    closeOnBlurBtn.classList.remove('active');
    minimizeOnBlurBtn.innerHTML = 'Minimize ⤵️';
    closeOnBlurBtn.innerHTML = 'Close ❌';

    // Si está pinned, no mostramos checkmarks en los botones de blur
    if (isPinned) return;

    // Mostrar checkmark solo en el modo activo
    if (blurMode === 'minimize') {
      minimizeOnBlurBtn.classList.add('active');
      minimizeOnBlurBtn.innerHTML += ' <span class="checkmark">✓</span>';
    } else if (blurMode === 'close') {
      closeOnBlurBtn.classList.add('active');
      closeOnBlurBtn.innerHTML += ' <span class="checkmark">✓</span>';
    }
  };

  // Event bindings (ventana)
  closeBtn?.addEventListener('click', () => winAPI?.close());
  minimizeBtn?.addEventListener('click', () => winAPI?.minimize());
  
  // Pin toggle: si activas pin quitamos ticks de blur (se persiste)
  pinBtn?.addEventListener('click', () => {
    isPinned = !isPinned;
    winAPI?.setPinStatus?.(isPinned);
    updatePinButton();
  });

  // Minimizar en blur: al elegirlo se quita pinned y se establece el modo
  minimizeOnBlurBtn?.addEventListener('click', () => {
    if (isPinned) {
      isPinned = false;
      winAPI?.setPinStatus?.(false);
    }
    blurMode = 'minimize';
    winAPI?.setBlurMode?.(blurMode);
    updatePinButton();
    updateBlurModeButtons();
  });

  // Cerrar en blur: similar al anterior
  closeOnBlurBtn?.addEventListener('click', () => {
    if (isPinned) {
      isPinned = false;
      winAPI?.setPinStatus?.(false);
    }
    blurMode = 'close';
    winAPI?.setBlurMode?.(blurMode);
    updatePinButton();
    updateBlurModeButtons();
  });

  // Reset session button -> limpia la partición persist:whatsapp desde main
  resetBtn?.addEventListener('click', async () => {
    setStatus('Reseteando sesión...', true);
    const res = await winAPI.clearWhatsappSession();
    if (res?.ok) {
      setStatus('Sesión reseteada. Recargando...', true);
      try { webview.loadURL('https://web.whatsapp.com/?t=' + Date.now()); } catch(e){}
      hideStatusAfter(4000);
    } else {
      setStatus('No se pudo resetear: ' + (res?.error || 'error desconocido'));
      hideStatusAfter(6000);
    }
  });

  // Helpers de UI
  function setStatus(text, showSpinner=false) {
    if (!statusMsg) return;
    statusMsg.style.display = 'inline';
    statusMsg.textContent = text;
  }
  function hideStatusAfter(ms=3000) {
    setTimeout(() => { if (statusMsg) statusMsg.style.display = 'none'; }, ms);
  }

  // -------------------------------------------------------------------------
  // Webview configuration and QR detection (restored to the previous working logic)
  // -------------------------------------------------------------------------
  if (webview) {
    const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

    // Set user agent and load URL (cache-busting)
    try {
      webview.setAttribute('useragent', chromeUA);
      webview.src = 'https://web.whatsapp.com/?t=' + Date.now();
    } catch (e) {
      console.warn('No se pudo setear src/useragent del webview:', e);
    }

    // Permisos para media/popups
    ['allowpopups', 'allowfullscreen', 'allowmediacapture', 'allowcamera', 'allowmicrophone']
      .forEach(attr => webview.setAttribute(attr, 'on'));

    // Escucha mensajes internos del webview para debugging
    webview.addEventListener('console-message', (e) => {
      // Para ver errores/console logs que ocurren dentro del webview
      console.log('WEBVIEW:', e.message);
    });

    // Workarounds y detección
    webview.addEventListener('did-finish-load', () => {
      webview.executeJavaScript(`
        try {
          if (document.body && document.body.innerText && document.body.innerText.includes("browser isn't supported")) {
            Object.defineProperty(navigator, 'userAgent', {
              value: '${chromeUA}',
              configurable: false
            });
            location.reload();
          }
        } catch(e) {}
      `).catch(()=>{});

      // Start QR checks after load completes
      startQrDetection();
    });

    // Insert CSS y polyfills cuando DOM ya está listo
    webview.addEventListener('dom-ready', async () => {
      const basePath = isPackaged ? `file://${window.process.resourcesPath}` : '';
      try {
        await webview.insertCSS(`
          @import url("${basePath}/styles/panel.css");
          .browser-not-supported { display: none !important; }
        `);
      } catch(e) { /* no fatal */ }
      try {
        await webview.executeJavaScript(`
          window.chrome = { runtime: {}, storage: {} };
          Object.defineProperty(navigator, 'plugins', { value: [{ name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' }]});
        `);
      } catch(e) { /* no fatal */ }
    });

    // Reintentos y manejo de fallos
    webview.addEventListener('did-fail-load', (e) => {
      console.warn('webview did-fail-load', e);
      setStatus('Fallo al cargar; reintentando...', true);
      setTimeout(() => {
        try { webview.reload(); } catch (err) { console.warn(err); }
      }, 700);
    });

    webview.addEventListener('crashed', async () => {
      console.error('webview crashed — intentando resetear session y recargar...');
      setStatus('Webview crash. Reseteando sesión...', true);
      await winAPI.clearWhatsappSession();
      setTimeout(() => {
        try { webview.loadURL('https://web.whatsapp.com/?t=' + Date.now()); } catch(e) {}
      }, 500);
    });

    // Script que detecta presencia del QR en la página (igual que antes)
    const checkForQrScript = `
      (function() {
        try {
          const selectors = [
            '[data-testid="qrcode"]',
            'canvas',
            'img[alt*="QR"]',
            '.landing-wrapper',
            '.qr'
          ];
          for (const s of selectors) {
            if (document.querySelector(s)) return true;
          }
          if (document.querySelector('#pane-side') || document.querySelector('[data-testid="chat-list-search"]')) return false;
          return false;
        } catch (e) { return false; }
      })();
    `;

    function startQrDetection() {
      // limpiar timers previos
      if (qrCheckInterval) clearInterval(qrCheckInterval);
      if (qrCheckTimeout) clearTimeout(qrCheckTimeout);

      let checks = 0;
      qrCheckInterval = setInterval(async () => {
        checks++;
        try {
          const hasQr = await webview.executeJavaScript(checkForQrScript, true);
          if (hasQr && checks >= 4) {
            resetBtn.style.display = 'inline-block';
            setStatus('Parece que la sesión no está iniciada — puedes resetear.', true);
          } else if (!hasQr) {
            resetBtn.style.display = 'none';
            statusMsg.style.display = 'none';
          }

          if (checks >= 20) {
            clearInterval(qrCheckInterval);
            qrCheckInterval = null;
          }
        } catch (err) {
          console.warn('Error verificando QR:', err);
          // no interrumpir la verificación; esperamos al próximo interval
        }
      }, 3000);

      // Timeout de seguridad: si en 45s aún hay problemas, mostrar botón de reset
      qrCheckTimeout = setTimeout(() => {
        resetBtn.style.display = 'inline-block';
        setStatus('Tiempo de espera excedido. Si no puedes entrar, pulsa "Resetear sesión".');
      }, 45000);
    }

    // limpiar timers al destruir o recargar el webview
    webview.addEventListener('destroyed', () => {
      if (qrCheckInterval) clearInterval(qrCheckInterval);
      if (qrCheckTimeout) clearTimeout(qrCheckTimeout);
    });

  } // end webview block

  // Mensajes desde main
  winAPI?.onForceReloadWebview?.(() => {
    try { webview.loadURL('https://web.whatsapp.com/?t=' + Date.now()); } catch(e) {}
  });

  winAPI?.onAppHide?.(() => {
    try { if (webview && webview.stop) webview.stop(); } catch (e) {}
  });

  // Inicializar UI desde storage
  initFromStorage();
});