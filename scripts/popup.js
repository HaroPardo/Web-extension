document.addEventListener('DOMContentLoaded', () => {
  chrome.windows.getCurrent((currentWindow) => {
    const width = 400;
    const height = currentWindow.height;
    const left = 0;
    const top = 0;
    
    chrome.windows.create({
      url: chrome.runtime.getURL('panel.html'),
      type: 'popup',
      width: width,
      height: height,
      left: left,
      top: top,
      focused: true
    }, (newWindow) => {
      window.close();
    });
  });
});