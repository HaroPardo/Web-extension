document.addEventListener('DOMContentLoaded', () => {
  const pinBtn = document.getElementById('pin-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  console.log("Botones de pestaña encontrados:", tabBtns.length);

  // Estado inicial
  let isPinned = false;
  let activeTab = 'whatsapp';
  
  // Función para enviar mensajes al service worker
  function sendMessage(message, callback) {
    chrome.runtime.sendMessage(message, callback);
  }
  
  // Función para manejar el almacenamiento
  function getStorageData(keys, callback) {
    sendMessage({type: "getStorage", keys}, callback);
  }
  
  function setStorageData(data, callback) {
    sendMessage({type: "setStorage", data}, callback);
  }
  
  // Cargar estado guardado
  getStorageData(['isPinned', 'activeTab'], (data) => {
    isPinned = data?.isPinned || false;
    activeTab = data?.activeTab || 'whatsapp';
    updatePinButton();
    switchTab(activeTab);
  });
  
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
    } else {
      console.error(`Elementos no encontrados para pestaña: ${tabId}`);
    }
  }
  
  function updatePinButton() {
    pinBtn.textContent = isPinned ? '✅ Fijado' : '📌 Fijar';
    pinBtn.style.background = isPinned ? '#43b581' : '#7289da';
    console.log("Estado de fijado actualizado:", isPinned);
  }
});