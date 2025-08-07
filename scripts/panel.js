document.addEventListener('DOMContentLoaded', () => {
  const pinBtn = document.getElementById('pin-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  console.log("Botones de pestaña encontrados:", tabBtns.length);

  // Estado inicial
  let isPinned = false;
  let activeTab = 'whatsapp';
  
  // Función para manejar webviews
  function initWebview(webview) {
    if (!webview) return;
    
    // Eventos para depuración
    webview.addEventListener('did-start-loading', () => {
      console.log(`Cargando: ${webview.getURL()}`);
    });
    
    webview.addEventListener('did-finish-load', () => {
      console.log(`Carga completada: ${webview.getURL()}`);
    });
    
    webview.addEventListener('did-fail-load', (event) => {
      console.error('Error cargando:', event.errorDescription);
      
      // Solución para WhatsApp
      if (event.errorDescription.includes('ERR_CONNECTION_REFUSED')) {
        setTimeout(() => {
          webview.reload();
        }, 2000);
      }
    });
    
    // Solución especial para WhatsApp
    if (webview.id === 'whatsapp-tab') {
      webview.addEventListener('dom-ready', () => {
        webview.executeJavaScript(`
          // Evitar detección de iframe
          Object.defineProperty(window, 'self', {value: window});
          Object.defineProperty(window, 'top', {value: window});
          
          // Forzar recarga si no carga
          if(!document.querySelector('body')) {
            location.reload();
          }
        `);
      });
    }
  }
  
  // Inicializar webviews
  document.querySelectorAll('webview').forEach(initWebview);
  
  // Cargar estado inicial
  setTimeout(() => {
    isPinned = false;
    activeTab = 'whatsapp';
    updatePinButton();
    switchTab(activeTab);
  }, 500);
  
  // Manejar clicks en pestañas
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      console.log("Click en pestaña:", tabId);
      switchTab(tabId);
    });
  });
  
  // Botón de fijado
  pinBtn.addEventListener('click', () => {
    isPinned = !isPinned;
    updatePinButton();
  });
  
  // Cerrar si no está fijado
  window.addEventListener('blur', () => {
    if (!isPinned) {
      window.close();
    }
  });
  
  function switchTab(tabId) {
    console.log("Cambiando a pestaña:", tabId);
    
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => {
      el.classList.remove('active');
    });
    
    const tabButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const tabContent = document.getElementById(`${tabId}-tab`);
    
    if (tabButton && tabContent) {
      tabButton.classList.add('active');
      tabContent.classList.add('active');
      console.log(`Pestaña ${tabId} activada correctamente`);
      
      // Forzar recarga si es necesario
      const webview = tabContent;
      if (webview.getURL() === '' || webview.getURL().includes('about:blank')) {
        webview.reload();
      }
    } else {
      console.error(`Elementos no encontrados para pestaña: ${tabId}`);
    }
  }
  
  function updatePinButton() {
    if (pinBtn) {
      pinBtn.textContent = isPinned ? '✅ Fijado' : '📌 Fijar';
      pinBtn.style.background = isPinned ? '#43b581' : '#7289da';
      console.log("Estado de fijado actualizado:", isPinned);
    }
  }
  
  // Botón para depuración
  const debugBtn = document.createElement('button');
  debugBtn.textContent = 'Depurar';
  debugBtn.style.position = 'absolute';
  debugBtn.style.top = '10px';
  debugBtn.style.right = '10px';
  debugBtn.style.zIndex = '10000';
  debugBtn.addEventListener('click', () => {
    const activeWebview = document.querySelector('.tab-content.active');
    activeWebview.openDevTools();
  });
  document.body.appendChild(debugBtn);
});