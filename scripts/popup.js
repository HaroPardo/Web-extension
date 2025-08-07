chrome.windows.create({
  url: chrome.runtime.getURL('panel.html'),
  type: 'popup',
  width: 400,
  height: 700,
  left: 0,
  top: 0
});

window.close();