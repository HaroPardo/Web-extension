const { contextBridge, ipcRenderer } = require('electron');

// Secure exposure of Electron APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  close: () => ipcRenderer.send('window-close'),
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  openDevTools: () => ipcRenderer.send('open-devtools'),
  setPinStatus: (status) => ipcRenderer.send('set-pin-status', status),
  getPinStatus: () => ipcRenderer.invoke('get-pin-status'),
  setBlurMode: (mode) => ipcRenderer.send('set-blur-mode', mode),
  getBlurMode: () => ipcRenderer.invoke('get-blur-mode'),
  onWindowRestore: (callback) => ipcRenderer.on('window-restore', callback),

  // New: clear WhatsApp session on demand
  clearWhatsappSession: () => ipcRenderer.invoke('clear-whatsapp-session'),
  // New: get userData path for debugging
  getUserDataPath: () => ipcRenderer.invoke('get-userdata-path'),

  // Renderer hooks triggered from main
  onAppHide: (cb) => ipcRenderer.on('app-hide', cb),
  onForceReloadWebview: (cb) => ipcRenderer.on('force-reload-webview', cb)
});
