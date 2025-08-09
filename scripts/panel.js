// panel.js (versión corregida)
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-btn');
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const pinBtn = document.getElementById('pin-btn');
  const webview = document.getElementById('whatsapp-tab');

  const winAPI = window.electronAPI || null;

  let isPinned = false;
  let inStartupGrace = true;
  setTimeout(() => { inStartupGrace = false; }, 2000);

  // Flag para saber si el webview ya está listo (dom-ready)
  let webviewReady = false;

  // Obtener estado de fijado desde el proceso principal
  if (winAPI && winAPI.getPinStatus) {
    winAPI.getPinStatus().then(status => {
      isPinned = status;
      updatePinButton();
    }).catch(()=>{ /* ignore */ });
  }

  // Controles de ventana
  closeBtn?.addEventListener('click', () => winAPI?.close());
  minimizeBtn?.addEventListener('click', () => winAPI?.minimize());
  maximizeBtn?.addEventListener('click', () => winAPI?.toggleMaximize());

  function updatePinButton() {
    if (!pinBtn) return;
    pinBtn.textContent = isPinned ? '✅ Fijado' : '📌 Fijar';
    pinBtn.classList.toggle('fijado', isPinned);
    if (winAPI?.setPinStatus) winAPI.setPinStatus(isPinned);
  }

  pinBtn?.addEventListener('click', () => {
    isPinned = !isPinned;
    updatePinButton();
  });

  if (!webview) {
    console.warn('No se encontró <webview id="whatsapp-tab">');
    return;
  }

  // MOBILE UA y viewport objetivo
  const mobileUA = 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
  const mobileViewportWidth = 390;

  // Forzar recarga para evitar caché
  webview.src = 'https://web.whatsapp.com/?t=' + Date.now();
  webview.setAttribute('useragent', mobileUA);

  // Calcular y aplicar zoom (solo si webviewReady)
  function calculateAndApplyZoom() {
    try {
      if (!webview || !webviewReady) {
        // Reintentar más tarde si no está listo
        return;
      }

      const wrap = document.querySelector('.webview-wrap');
      if (!wrap) return;

      const containerWidth = wrap.clientWidth;
      const containerHeight = wrap.clientHeight;

      if (containerWidth < 10 || containerHeight < 10) {
        // Reintentar cuando cambie tamaño
        return;
      }

      const zoom = containerWidth / mobileViewportWidth;
      const finalZoom = Math.min(Math.max(zoom, 0.5), 2.5);

      // Establece el zoom: solo cuando el webview está listo
      // El método setZoomFactor puede lanzar si no está adjuntado, por eso lo intentamos en try/catch
      try {
        webview.setZoomFactor(finalZoom);
      } catch (err) {
        // Si falla por estar momentáneamente desconectado, reintentamos en breve
        console.warn('setZoomFactor temporalmente no disponible, reintentando', err);
        setTimeout(calculateAndApplyZoom, 150);
      }

      webview.style.width = `${containerWidth}px`;
      webview.style.height = `${containerHeight}px`;
    } catch (err) {
      console.error('Error en calculateAndApplyZoom:', err);
    }
  }

  // Observador de cambios de tamaño: solo pide recalcular (no fuerza ejecución si webview no listo)
  const wrap = document.querySelector('.webview-wrap');
  const resizeObserver = new ResizeObserver(() => {
    // Si no hay wrap o webview, no hacemos nada
    if (!wrap) return;
    // Llamamos a calculateAndApplyZoom; ella misma hará las comprobaciones
    calculateAndApplyZoom();
  });

  if (wrap) {
    resizeObserver.observe(wrap);
  }

  // Eventos del webview
  webview.addEventListener('did-start-loading', () => console.log('WhatsApp: cargando...'));

  webview.addEventListener('did-fail-load', (ev) => {
    console.error('Error al cargar:', ev.errorDescription);
    setTimeout(() => { 
      webview.reloadIgnoringCache(); 
    }, 1400);
  });

  webview.addEventListener('did-finish-load', () => {
    console.log('WhatsApp: carga completa');
    // Intentamos recalcular cuando la carga termine
    calculateAndApplyZoom();
  });

  // DOM listo dentro del webview: aquí ya se puede usar setZoomFactor de forma segura
  webview.addEventListener('dom-ready', async () => {
    console.log('DOM del webview listo');
    webviewReady = true;

    try {
      await webview.insertCSS(`
        html, body, #app, .app, .app-wrapper, .two-col, .app-root { 
          height: 100% !important; 
          min-height: 100% !important; 
          overflow: hidden !important;
        }
        html, body { margin: 0 !important; padding: 0 !important; }
        .app, .app-wrapper, .two-col, .app-root { display: flex !important; flex-direction: column !important; }
        .pane-list, .pane-chat, .pane-body, .pane-container { flex: 1 !important; min-height: 0 !important; }
      `);

      await webview.executeJavaScript(`
        try {
          document.documentElement.style.height = '100%';
          document.body.style.height = '100%';
          document.body.style.margin = '0';
          document.body.style.padding = '0';
          const mainElements = ['#app', '.app', '.app-wrapper', '.two-col', '.app-root'];
          mainElements.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
              el.style.height = '100%';
              el.style.minHeight = '100%';
              el.style.margin = '0';
              el.style.padding = '0';
              el.style.overflow = 'hidden';
              el.style.display = 'flex';
              el.style.flexDirection = 'column';
            }
          });
          const innerPanels = ['.pane-list', '.pane-chat', '.pane-body', '.pane-container'];
          innerPanels.forEach(selector => {
            const panels = document.querySelectorAll(selector);
            panels.forEach(panel => {
              panel.style.flex = '1';
              panel.style.minHeight = '0';
            });
          });
        } catch(e) { console.error('Error interno:', e); }
      `);

      // Una vez que el webview está listo, forzamos el cálculo
      calculateAndApplyZoom();
    } catch (err) {
      console.error('Error en dom-ready:', err);
    }
  });

  // Auto-cierre cuando pierde foco
  window.addEventListener('blur', () => {
    if (inStartupGrace) return;
    if (!isPinned && winAPI?.close) {
      winAPI.close();
    }
  });

  // Botón de depuración (igual que antes)
  const debugBtn = document.createElement('button');
  debugBtn.textContent = 'Depurar';
  debugBtn.style.position = 'absolute';
  debugBtn.style.top = '8px';
  debugBtn.style.right = '8px';
  debugBtn.style.zIndex = '9999';
  debugBtn.style.padding = '6px 10px';
  debugBtn.style.background = '#7289da';
  debugBtn.style.color = 'white';
  debugBtn.style.border = 'none';
  debugBtn.style.borderRadius = '4px';
  debugBtn.style.cursor = 'pointer';
  debugBtn.addEventListener('click', () => {
    if (winAPI?.openDevTools) winAPI.openDevTools();
    else alert('Abre DevTools manualmente');
  });
  document.body.appendChild(debugBtn);
});