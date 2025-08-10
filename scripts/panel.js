document.addEventListener('DOMContentLoaded', () => {
  // Detectar si estamos en entorno empaquetado
  const isPackaged = window.process && window.process.resourcesPath !== undefined;
  
  const closeBtn = document.getElementById('close-btn');
  const minimizeBtn = document.getElementById('minimize-btn');
  const pinBtn = document.getElementById('pin-btn');
  const minimizeOnBlurBtn = document.getElementById('minimize-on-blur-btn');
  const closeOnBlurBtn = document.getElementById('close-on-blur-btn');
  const webview = document.getElementById('whatsapp-tab');
  const winAPI = window.electronAPI || null;

  let isPinned = false;
  let blurMode = 'minimize'; // Modo por defecto
  let inStartupGrace = true;
  setTimeout(() => { inStartupGrace = false; }, 2000);

  // Obtener estados guardados
  if (winAPI?.getPinStatus) {
    winAPI.getPinStatus().then(status => {
      isPinned = status;
      updatePinButton();
    });
  }

  if (winAPI?.getBlurMode) {
    winAPI.getBlurMode().then(mode => {
      blurMode = mode;
      updateBlurModeButtons();
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

  function updateBlurModeButtons() {
    if (!minimizeOnBlurBtn || !closeOnBlurBtn) return;
    
    if (blurMode === 'minimize') {
      minimizeOnBlurBtn.classList.add('active');
      closeOnBlurBtn.classList.remove('active');
    } else {
      minimizeOnBlurBtn.classList.remove('active');
      closeOnBlurBtn.classList.add('active');
    }
  }

  pinBtn?.addEventListener('click', () => {
    isPinned = !isPinned;
    updatePinButton();
  });

  minimizeOnBlurBtn?.addEventListener('click', () => {
    blurMode = 'minimize';
    winAPI?.setBlurMode?.(blurMode);
    updateBlurModeButtons();
  });

  closeOnBlurBtn?.addEventListener('click', () => {
    blurMode = 'close';
    winAPI?.setBlurMode?.(blurMode);
    updateBlurModeButtons();
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
    // Obtener la ruta base para los recursos
    const basePath = isPackaged 
      ? `file://${window.process.resourcesPath}`
      : '';
    
    // CSS para forzar compatibilidad
    await webview.insertCSS(`
      /* Importar nuestro CSS principal */
      @import url("${basePath}/styles/panel.css");
      
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
      
      /* Permitir que WhatsApp se adapte a cualquier ancho */
      .app-wrapper, .two, ._1WZqU {
        width: 100% !important;
        max-width: none !important;
      }
      
      ._2Ts6i {
        min-width: auto !important;
      }
      
      ._1qNwV {
        padding-left: 10px !important;
        padding-right: 10px !important;
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
});