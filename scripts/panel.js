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

    isPinned = await winAPI.getPinStatus();
    blurMode = await winAPI.getBlurMode();

    updatePinButton();
    updateBlurModeButtons();
  };

  // Update pin button visual state
  const updatePinButton = () => {
    if (!pinBtn) return;
    pinBtn.textContent = isPinned ? '✅ Pinned' : '📌 Pin';
    pinBtn.classList.toggle('pinned', isPinned);
    winAPI?.setPinStatus?.(isPinned);
  };

  // Update behavior mode buttons
  const updateBlurModeButtons = () => {
    if (!minimizeOnBlurBtn || !closeOnBlurBtn) return;

    // Clear all active states
    minimizeOnBlurBtn.classList.remove('active');
    closeOnBlurBtn.classList.remove('active');

    // Apply mode-specific UI
    if (!isPinned) {
      const activeButton = blurMode === 'minimize' 
        ? minimizeOnBlurBtn 
        : closeOnBlurBtn;

      activeButton.classList.add('active');
      activeButton.innerHTML = `${activeButton.textContent.replace(/✓/g, '')} <span class="checkmark">✓</span>`;
    }
  };

  // Event bindings
  closeBtn?.addEventListener('click', () => winAPI?.close());
  minimizeBtn?.addEventListener('click', () => winAPI?.minimize());

  pinBtn?.addEventListener('click', () => {
    isPinned = !isPinned;
    updatePinButton();
    updateBlurModeButtons();
  });

  minimizeOnBlurBtn?.addEventListener('click', () => {
    if (isPinned) return;
    blurMode = 'minimize';
    winAPI?.setBlurMode?.(blurMode);
    updateBlurModeButtons();
  });

  closeOnBlurBtn?.addEventListener('click', () => {
    if (isPinned) return;
    blurMode = 'close';
    winAPI?.setBlurMode?.(blurMode);
    updateBlurModeButtons();
  });

  // Reset session button
  resetBtn?.addEventListener('click', async () => {
    setStatus('Reseteando sesión...', true);
    const res = await winAPI.clearWhatsappSession();
    if (res?.ok) {
      setStatus('Sesión reseteada. Recargando...', true);
      // recargar el webview
      if (webview) webview.loadURL('https://web.whatsapp.com/?t=' + Date.now());
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

  // Configure WhatsApp webview
  if (webview) {
    const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
    webview.src = 'https://web.whatsapp.com/?t=' + Date.now();  // Cache busting
    webview.setAttribute('useragent', chromeUA);

    // Permission flags for media access
    ['allowpopups', 'allowfullscreen', 'allowmediacapture', 'allowcamera', 'allowmicrophone']
      .forEach(attr => webview.setAttribute(attr, 'on'));

    // Browser compatibility workaround
    webview.addEventListener('did-finish-load', () => {
      webview.executeJavaScript(`
        if (document.body.innerText.includes("browser isn't supported")) {
          Object.defineProperty(navigator, 'userAgent', {
            value: '${chromeUA}',
            configurable: false
          });
          location.reload();
        }
      `).catch(()=>{});

      // Iniciar verificación de QR (sólo si no hemos iniciado sesión)
      startQrDetection();
    });

    // Inject custom CSS
    webview.addEventListener('dom-ready', async () => {
      const basePath = isPackaged 
        ? `file://${window.process.resourcesPath}`
        : '';

      await webview.insertCSS(`
        @import url("${basePath}/styles/panel.css");
        .browser-not-supported { display: none !important; }
      `).catch(()=>{});

      // Polyfill Chrome APIs expected by WhatsApp
      webview.executeJavaScript(`
        window.chrome = { runtime: {}, storage: {} };
        Object.defineProperty(navigator, 'plugins', { value: [{
          name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer'
        }]});
      `).catch(()=>{});
    });

    webview.addEventListener('did-fail-load', (e) => {
      console.warn('webview did-fail-load', e);
      setStatus('Fallo al cargar, intentando recargar...', true);
      setTimeout(() => webview.reload(), 700);
    });

    webview.addEventListener('crashed', async () => {
      console.error('webview crashed — intentando resetear session y recargar...');
      setStatus('Webview crash. Reseteando sesión...', true);
      await winAPI.clearWhatsappSession();
      setTimeout(() => webview.loadURL('https://web.whatsapp.com/?t=' + Date.now()), 500);
    });

    // Detector simple de QR: si aparece el QR repetidamente durante X segundos
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
          // Si detectamos elementos del panel principal (logged-in), devolvemos false
          if (document.querySelector('#pane-side') || document.querySelector('[data-testid="chat-list-search"]')) return false;
          return false;
        } catch (e) { return false; }
      })();
    `;

    function startQrDetection() {
      // limpiar timers previos
      if (qrCheckInterval) clearInterval(qrCheckInterval);
      if (qrCheckTimeout) clearTimeout(qrCheckTimeout);

      // cada 3s verificamos si hay QR
      let checks = 0;
      qrCheckInterval = setInterval(async () => {
        checks++;
        try {
          const hasQr = await webview.executeJavaScript(checkForQrScript, true);
          // si hay QR y han pasado > 4 checks (12s) mostramos el botón de reset
          if (hasQr && checks >= 4) {
            resetBtn.style.display = 'inline-block';
            setStatus('Parece que la sesión no está iniciada — puedes resetear.', true);
          } else if (!hasQr) {
            // usuario probablemente autenticado o en otra pantalla
            resetBtn.style.display = 'none';
            statusMsg.style.display = 'none';
          }

          // stop after 20 checks (~60s) para no dejar interval corriendo
          if (checks >= 20) {
            clearInterval(qrCheckInterval);
            qrCheckInterval = null;
          }
        } catch (err) {
          console.warn('Error verificando QR:', err);
        }
      }, 3000);

      // Safety timeout: si en 45s el webview sigue sin cargar, mostramos la opción de reset
      qrCheckTimeout = setTimeout(() => {
        resetBtn.style.display = 'inline-block';
        setStatus('Tiempo de espera excedido. Si no puedes entrar, pulsa "Resetear sesión".');
      }, 45000);
    }

    // limpiar timers al destruir o recargar
    webview.addEventListener('destroyed', () => { if (qrCheckInterval) clearInterval(qrCheckInterval); if (qrCheckTimeout) clearTimeout(qrCheckTimeout); });

  }

  // Reacciones a mensajes del main (por ejemplo tray reset)
  winAPI?.onForceReloadWebview?.(() => {
    if (webview) webview.loadURL('https://web.whatsapp.com/?t=' + Date.now());
  });

  winAPI?.onAppHide?.(() => {
    // opcional: detener navegación para evitar estados intermedios
    try { if (webview && webview.stop) webview.stop(); } catch (e) {}
  });

  // Initialize application
  initFromStorage();
});