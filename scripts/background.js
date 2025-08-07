chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getStorage") {
    chrome.storage.local.get(request.keys, (data) => {
      sendResponse(data);
    });
    return true; // Indica que responderemos asíncronamente
  }
  
  if (request.type === "setStorage") {
    chrome.storage.local.set(request.data, () => {
      sendResponse({success: true});
    });
    return true;
  }
});