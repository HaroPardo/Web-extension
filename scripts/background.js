console.log("Background script cargado");

// Crear iframe puente
const iframe = document.createElement('iframe');
iframe.id = "background-bridge";
iframe.src = chrome.runtime.getURL('bridge.html');
iframe.style.display = 'none';
document.body.appendChild(iframe);

// Escuchar mensajes
window.addEventListener("message", (event) => {
  if (event.data.direction === "from-panel") {
    const message = event.data.message;
    
    if (message.type === "getStorage") {
      chrome.storage.local.get(message.keys, (data) => {
        // Responder al panel
        event.source.postMessage({
          direction: "from-background",
          message: {
            type: "storageData",
            data: data
          }
        }, event.origin);
      });
    }
    
    if (message.type === "setStorage") {
      chrome.storage.local.set(message.data, () => {
        console.log("Datos guardados:", message.data);
      });
    }
  }
});