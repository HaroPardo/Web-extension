const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  close: () => ipcRenderer.send('window-close'),
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  openDevTools: () => ipcRenderer.send('open-devtools'),
  setPinStatus: (status) => ipcRenderer.send('set-pin-status', status),
  getPinStatus: () => ipcRenderer.invoke('get-pin-status'),
  
  // Nuevos métodos para el comportamiento al perder foco
  setBlurMode: (mode) => ipcRenderer.send('set-blur-mode', mode),
  getBlurMode: () => ipcRenderer.invoke('get-blur-mode')
});
