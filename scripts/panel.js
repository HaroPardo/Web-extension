// Guardar estado del panel y "pinned"
document.getElementById('pin-btn').addEventListener('click', () => {
  chrome.storage.local.set({ isPinned: true });
});

// Cerrar solo si no está "pinned"
window.addEventListener('blur', () => {
  chrome.storage.local.get('isPinned', (data) => {
    if (!data.isPinned) window.close();
  });
});