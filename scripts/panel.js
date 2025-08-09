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

  // User-Agent actualizado (Chrome 125 - compatible con WhatsApp)
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
  
  webview.src = 'https://web.whatsapp.com/?t=' + Date.now();
  webview.setAttribute('useragent', desktopUA);

  // Configuración esencial para WhatsApp
  webview.setAttribute('allowpopups', 'on');
  webview.setAttribute('allowfullscreen', 'on');
  webview.setAttribute('allowmediacapture', 'on');
  webview.setAttribute('allowcamera', 'on');
  webview.setAttribute('allowmicrophone', 'on');

  webview.addEventListener('did-finish-load', () => {
    // Detectar y solucionar mensaje de navegador no soportado
    webview.executeJavaScript(`
      if (document.body.innerText.includes("browser isn't supported")) {
        location.reload();
      }
    `);
  });

  webview.addEventListener('dom-ready', async () => {
    // CSS para forzar el modo móvil
    await webview.insertCSS(`
      * {
        -webkit-user-select: none !important;
        user-select: none !important;
      }
      
      html, body, #app, .app, .app-wrapper {
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      
      /* Ocultar barra de navegación de WhatsApp */
      ._1WZqU, ._3j7s9 {
        display: none !important;
      }
    `);
    
    // Solicitar permisos necesarios
    webview.executeJavaScript(`
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