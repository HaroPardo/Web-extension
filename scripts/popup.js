document.addEventListener('DOMContentLoaded', () => {
  chrome.windows.getCurrent((currentWindow) => {
    chrome.windows.create({
      url: chrome.runtime.getURL('panel.html'),
      type: 'popup',
      width: 400,
      height: currentWindow.height,
      left: 0,
      top: 0,
      focused: true
    }, (newWindow) => {
      setTimeout(() => window.close(), 300);
    });
  });
});