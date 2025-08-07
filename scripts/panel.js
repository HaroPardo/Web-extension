document.addEventListener('DOMContentLoaded', () => {
  const pinBtn = document.getElementById('pin-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  console.log("Botones de pestaña encontrados:", tabBtns.length);

  // Estado inicial
  let isPinned = false;
  let activeTab = 'whatsapp';
  const bridgeIframe = document.getElementById('background-bridge');
  
  // Función para enviar mensajes al background
  function sendToBackground(message) {
    bridgeIframe.contentWindow.postMessage({
      direction: "from-panel",
      message: message
    }, "*");
  }
  
  // Función para manejar el almacenamiento
  function getStorageData(keys) {
    sendToBackground({type: "getStorage", keys});
  }
  
  function setStorageData(data) {
    sendToBackground({type: "setStorage", data});
  }

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
      
      // Forzar recarga del webview
      const webview = tabContent.querySelector('webview');
      if (webview) {
        const currentSrc = webview.getAttribute('src');
        webview.setAttribute('src', 'about:blank');
        setTimeout(() => {
          webview.setAttribute('src', currentSrc);
        }, 100);
      }
      
      console.log(`Pestaña ${tabId} activada correctamente`);
    } else {
      console.error(`Elementos no encontrados para pestaña: ${tabId}`);
    }
  }
  
  // Escuchar respuestas del background
  window.addEventListener("message", (event) => {
    if (event.data.direction === "from-background") {
      const message = event.data.message;
      
      if (message.type === "storageData") {
        isPinned = message.data?.isPinned || false;
        activeTab = message.data?.activeTab || 'whatsapp';
        updatePinButton();
        switchTab(activeTab);
      }
    }
  });
  
  // Cargar estado guardado
  getStorageData(['isPinned', 'activeTab']);
  
  // Manejar clicks en pestañas
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      console.log("Click en pestaña:", tabId);
      switchTab(tabId);
      setStorageData({activeTab: tabId});
    });
  });
  
  // Botón de fijado
  pinBtn.addEventListener('click', () => {
    isPinned = !isPinned;
    updatePinButton();
    setStorageData({isPinned});
  });
  
  // Cerrar si no está fijado
  let ignoreBlur = false;
  
  document.addEventListener('mousedown', (e) => {
    ignoreBlur = !e.target.closest('.sidebar');
  });
  
  window.addEventListener('blur', () => {
    if (!isPinned && !ignoreBlur) {
      window.close();
    }
  });
  
  function updatePinButton() {
    if (pinBtn) {
      pinBtn.textContent = isPinned ? '✅ Fijado' : '📌 Fijar';
      pinBtn.style.background = isPinned ? '#43b581' : '#7289da';
      console.log("Estado de fijado actualizado:", isPinned);
    }
  }

  // Configuración de webviews
  document.querySelectorAll('webview').forEach(webview => {
    webview.addEventListener('did-fail-load', (event) => {
      console.error('Error cargando:', event.errorDescription);
      
      // Intentar recargar después de 3 segundos
      setTimeout(() => {
        const currentSrc = webview.getAttribute('src');
        webview.setAttribute('src', 'about:blank');
        setTimeout(() => {
          webview.setAttribute('src', currentSrc);
        }, 100);
      }, 3000);
    });

    // NUEVO: Estilos y modificaciones para webviews
    webview.addEventListener('dom-ready', () => {
      // Aplicar estilos CSS personalizados
      webview.insertCSS(`
        body {
          background-color: #111;
        }
        /* Oculta elementos que puedan bloquear la vista */
        .landing-header, .cookie-banner {
          display: none !important;
        }
      `);
      
      // Modificaciones específicas para WhatsApp
      webview.executeJavaScript(`
        if(window.location.href.includes('whatsapp')) {
          document.documentElement.style.setProperty('--pane-width', '100%');
        }
      `);
    });
  });
});