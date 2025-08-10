document.addEventListener('DOMContentLoaded', () => {
  const isPackaged = window.process?.resourcesPath !== undefined;
  
  // UI element references
  const closeBtn = document.getElementById('close-btn');
  const minimizeBtn = document.getElementById('minimize-btn');
  const pinBtn = document.getElementById('pin-btn');
  const minimizeOnBlurBtn = document.getElementById('minimize-on-blur-btn');
  const closeOnBlurBtn = document.getElementById('close-on-blur-btn');
  const webview = document.getElementById('whatsapp-tab');
  const winAPI = window.electronAPI || null;  // Preload-safe access

  // State variables
  let isPinned = false;
  let blurMode = 'minimize';
  
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
      `);
    });

    // Inject custom CSS
    webview.addEventListener('dom-ready', async () => {
      const basePath = isPackaged 
        ? `file://${window.process.resourcesPath}`
        : '';
      
      await webview.insertCSS(`
        @import url("${basePath}/styles/panel.css");
        .browser-not-supported { display: none !important; }
        /* Additional WhatsApp layout fixes */
      `);

      // Polyfill Chrome APIs expected by WhatsApp
      webview.executeJavaScript(`
        window.chrome = { runtime: {}, storage: {} };
        Object.defineProperty(navigator, 'plugins', { value: [{
          name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer'
        }]});
      `);
    });
  }

  // Initialize application
  initFromStorage();
});