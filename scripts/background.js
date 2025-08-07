console.log("Background script cargado");

// Manejar mensajes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getStorage") {
    chrome.storage.local.get(message.keys, (data) => {
      sendResponse({type: "storageData", data});
    });
    return true;
  }
  
  if (message.type === "setStorage") {
    chrome.storage.local.set(message.data, () => {
      sendResponse({success: true});
    });
    return true;
  }
});

// Inicializar almacenamiento
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    isPinned: false, 
    activeTab: 'whatsapp' 
  });
});