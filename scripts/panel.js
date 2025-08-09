// panel.js
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

  let webviewReady = false;

  if (winAPI?.getPinStatus) {
    winAPI.getPinStatus().then(status => {
      isPinned = status;
      updatePinButton();
    });
  }

  closeBtn?.addEventListener('click', () => winAPI?.close());
  minimizeBtn?.addEventListener('click', () => winAPI?.minimize());
  maximizeBtn?.addEventListener('click', () => winAPI?.toggleMaximize());

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

  const mobileUA = 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
  webview.src = 'https://web.whatsapp.com/?t=' + Date.now();
  webview.setAttribute('useragent', mobileUA);

  function resizeWebview() {
    if (!webviewReady) return;
    webview.style.width = '100%';
    webview.style.height = '100%';
  }

  const wrap = document.querySelector('.webview-wrap');
  new ResizeObserver(resizeWebview).observe(wrap);

  webview.addEventListener('did-finish-load', () => {
    webviewReady = true;
    resizeWebview();
  });

  webview.addEventListener('dom-ready', async () => {
    webviewReady = true;
    resizeWebview();

    await webview.insertCSS(`
      html, body, #app, .app, .app-wrapper, .two-col, .app-root {
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
    `);
  });

  window.addEventListener('blur', () => {
    if (!inStartupGrace && !isPinned) winAPI?.close();
  });
});