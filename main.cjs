// main.cjs
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const ElectronStore = require('electron-store'); // usa la v8 (CommonJS)

// Desactivar la aceleración por hardware para evitar crashes GPU en Windows
app.disableHardwareAcceleration();
// opción alternativa/extra (descomentar si hace falta):
// app.commandLine.appendSwitch('disable-gpu');

let mainWindow;
const store = new ElectronStore();

function createWindow() {
  // Ventana tipo sidebar: fijo ancho, no redimensionable ni maximizable
  mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    minWidth: 300,
    minHeight: 600,
    resizable: false,      // no permite cambiar tamaño
    maximizable: false,    // no permite maximizar
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  // Aplicar estado "fijado" (always on top) según lo guardado
  const pinned = store.get('isPinned', false) || false;
  mainWindow.setAlwaysOnTop(!!pinned);

  mainWindow.loadFile(path.join(__dirname, 'panel.html'));

  // (Opcional) abrir devtools para depuración
  // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

// IPC para controles de ventana
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-toggle-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('open-devtools', () => mainWindow?.webContents.openDevTools({ mode: 'detach' }));

// Manejar estado de "fijado" (persistir y aplicar alwaysOnTop)
ipcMain.on('set-pin-status', (_, status) => {
  store.set('isPinned', !!status);
  if (mainWindow) mainWindow.setAlwaysOnTop(!!status);
});

ipcMain.handle('get-pin-status', () => {
  return store.get('isPinned', false) || false;
});

// Ciclo de vida de la app
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
