document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-btn');
  const minimizeBtn = document.getElementById('minimize-btn');
  const pinBtn = document.getElementById('pin-btn');
  const webview = document.getElementById('whatsapp-tab');
  const winAPI = window.electronAPI || null;

  let isPinned = false;
  let inStartupGrace = true;
  setTimeout(() => { inStartupGrace = false; }, 2000);

  if (winAPI?.getPinStatus) {
    winAPI.getPinStatus().then(status => {
      isPinned = status;
      updatePinButton();
    });
  }

  closeBtn?.addEventListener('click', () => winAPI?.close());
  minimizeBtn?.addEventListener('click', () => winAPI?.minimize());

  function updatePinButton() {
    if (!pinBtn) return;
    pinBtn.textContent = isPinned ? '✅ Fijado' : '📌 Fijar';
    pinBtn.classList.toggle('fijado', isPinned);
    winAPI?.setPinStatus?.(isPinned);
  }

  pinBtn?.addEventListener('click', () => {
    isPinned = !isPinned;
    updatePinButton();
  });

  if (!webview) return;

  // User-Agent actualizado para Chrome 138 (última versión)
  const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
  
  webview.src = 'https://web.whatsapp.com/?t=' + Date.now();
  webview.setAttribute('useragent', chromeUA);

  // Configuración esencial para WhatsApp
  webview.setAttribute('allowpopups', 'on');
  webview.setAttribute('allowfullscreen', 'on');
  webview.setAttribute('allowmediacapture', 'on');
  webview.setAttribute('allowcamera', 'on');
  webview.setAttribute('allowmicrophone', 'on');

  // Solución definitiva para el error de compatibilidad
  webview.addEventListener('did-finish-load', () => {
    // Detectar y solucionar mensaje de navegador no soportado
    webview.executeJavaScript(`
      // 1. Verificar si aparece el mensaje de error
      const errorMsg = document.querySelector('body')?.innerText?.includes("browser isn't supported");
      
      // 2. Si hay error, forzar la compatibilidad
      if (errorMsg) {
        // Eliminar mensaje de error
        document.querySelector('body').innerHTML = '';
        
        // Forzar compatibilidad con Chrome
        Object.defineProperty(navigator, 'userAgent', {
          value: '${chromeUA}',
          configurable: false,
          writable: false
        });
        
        // Recargar WhatsApp
        location.reload();
      }
      
      // 3. Devolver estado para depuración
      errorMsg;
    `).then((needsReload) => {
      if (needsReload) {
        console.log('WhatsApp reloaded with Chrome compatibility fix');
      }
    });
  });

  webview.addEventListener('dom-ready', async () => {
    // CSS para forzar compatibilidad
    await webview.insertCSS(`
      /* Ocultar mensaje de incompatibilidad */
      .browser-not-supported {
        display: none !important;
      }
      
      /* Forzar diseño responsive */
      html, body, #app, .app, .app-wrapper {
        height: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      
      /* Ajustes específicos para WhatsApp */
      ._1WZqU, ._3j7s9 {
        height: 100vh !important;
      }
    `);
    
    // Forzar características de Chrome
    webview.executeJavaScript(`
      // Simular Chrome completamente
      window.chrome = {
        app: { isInstalled: true },
        runtime: {},
        storage: {},
        tabs: {},
        webstore: {}
      };
      
      // Habilitar todas las características
      Object.defineProperty(navigator, 'plugins', {
        value: [{
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer'
        }],
        configurable: false
      });
      
      Object.defineProperty(navigator, 'languages', {
        value: ['es-ES', 'es', 'en-US', 'en'],
        configurable: false
      });
      
      // Solicitar permisos necesarios
      Notification.requestPermission();
      navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    `);
  });

  // Manejar solicitudes de permisos
  webview.addEventListener('permissionrequest', (e) => {
    if (['media', 'geolocation', 'notifications'].includes(e.permission)) {
      e.request.allow();
    }
  });

  window.addEventListener('blur', () => {
    if (!inStartupGrace && !isPinned) winAPI?.close();
  });
});