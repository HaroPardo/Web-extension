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
      console.log(`Cargando: ${webview.src}`);
    });
    
    webview.addEventListener('did-finish-load', () => {
      console.log(`Carga completada: ${webview.src}`);
      // Solución especial para WhatsApp después de cargar
      if (webview.id === 'whatsapp-tab' && webview.src.includes('whatsapp')) {
        webview.executeJavaScript(`
          // Solución definitiva para detección de iframe
          try {
            Object.defineProperty(window, 'self', {value: window});
            Object.defineProperty(window, 'top', {value: window});
            window.name = 'whatsapp-webview';
          } catch(e) {}
          
          // Verificar si WhatsApp bloqueó la carga
          if(!document.querySelector('body')) {
            setTimeout(() => location.reload(), 1000);
          }
        `);
      }
    });
    
    webview.addEventListener('did-fail-load', (event) => {
      console.error('Error cargando:', event.errorDescription);
      
      // Soluciones para errores comunes
      if (event.errorDescription.includes('ERR_CONNECTION_REFUSED') || 
          event.errorDescription.includes('ERR_BLOCKED_BY_CLIENT') ||
          event.errorDescription.includes('ERR_BLOCKED_BY_RESPONSE')) {
        setTimeout(() => {
          // Solución definitiva: recarga con timestamp
          webview.src = webview.src.split('?')[0] + '?t=' + Date.now();
        }, 2000);
      }
    });
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
      
      // Solución definitiva para carga
      if (!tabContent.src || tabContent.src.includes('about:blank')) {
        if (tabId === 'whatsapp') {
          tabContent.src = 'https://web.whatsapp.com/?t=' + Date.now();
        } else if (tabId === 'discord') {
          tabContent.src = 'https://discord.com/login?t=' + Date.now();
        }
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
  
  // Botón para depuración (SOLUCIÓN FUNCIONAL)
  const debugBtn = document.createElement('button');
  debugBtn.textContent = 'Depurar';
  debugBtn.style.position = 'absolute';
  debugBtn.style.top = '10px';
  debugBtn.style.right = '10px';
  debugBtn.style.zIndex = '10000';
  debugBtn.addEventListener('click', () => {
    const activeWebview = document.querySelector('.tab-content.active');
    if (activeWebview && activeWebview.getDevTools) {
      const devTools = activeWebview.getDevTools();
      if (devTools) {
        devTools.open();
      } else {
        console.error('No se pudo obtener DevTools para el webview');
      }
    } else {
      console.error('Webview no encontrado o API no disponible');
    }
  });
  document.body.appendChild(debugBtn);
});