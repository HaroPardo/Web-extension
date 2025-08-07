document.addEventListener('DOMContentLoaded', () => {
  const pinBtn = document.getElementById('pin-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  // Log para verificar cuántos botones se encontraron
  console.log("Botones de pestaña encontrados:", tabBtns.length);

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
      // Log del botón clickeado
      console.log("Click en pestaña:", tabId);
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
    console.log("Cambiando a pestaña:", tabId);
    
    // Desactivar todas las pestañas
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => {
      el.classList.remove('active');
    });
    
    // Activar pestaña seleccionada
    const tabButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const tabContent = document.getElementById(`${tabId}-tab`);
    
    if (tabButton && tabContent) {
      tabButton.classList.add('active');
      tabContent.classList.add('active');
      console.log(`Pestaña ${tabId} activada correctamente`);
    } else {
      console.error(`Elementos no encontrados para pestaña: ${tabId}`);
      console.log("Botón:", tabButton, "Contenido:", tabContent);
    }
  }
  
  function updatePinButton() {
    pinBtn.textContent = isPinned ? '✅ Fijado' : '📌 Fijar';
    pinBtn.style.background = isPinned ? '#43b581' : '#7289da';
    console.log("Estado de fijado actualizado:", isPinned);
  }
});