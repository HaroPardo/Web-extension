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
});