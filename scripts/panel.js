document.addEventListener('DOMContentLoaded', () => {
  const pinBtn = document.getElementById('pin-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  // Estado de fijado
  let isPinned = false;
  
  // Cargar estado guardado
  chrome.storage.local.get(['isPinned', 'activeTab'], (data) => {
    isPinned = data.isPinned || false;
    updatePinButton();
    
    // Activar última pestaña usada
    const activeTab = data.activeTab || 'whatsapp';
    switchTab(activeTab);
  });
  
  // Manejar clicks en pestañas
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
      
      // Guardar pestaña activa
      chrome.storage.local.set({ activeTab: tabId });
    });
  });
  
  // Botón de fijado
  pinBtn.addEventListener('click', () => {
    isPinned = !isPinned;
    updatePinButton();
    chrome.storage.local.set({ isPinned });
  });
  
  // Cerrar si no está fijado
  window.addEventListener('blur', () => {
    if (!isPinned) {
      window.close();
    }
  });
  
  function switchTab(tabId) {
    // Desactivar todas las pestañas
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => {
      el.classList.remove('active');
    });
    
    // Activar pestaña seleccionada
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
  }
  
  function updatePinButton() {
    pinBtn.textContent = isPinned ? '✅ Fijado' : '📌 Fijar';
    pinBtn.style.background = isPinned ? '#43b581' : '#7289da';
  }
});