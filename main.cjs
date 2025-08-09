const path = require('path');
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const ElectronStore = require('electron-store');

app.disableHardwareAcceleration();

let mainWindow;
const store = new ElectronStore();

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  const winWidth = 400;
  const winHeight = 800;
  const x = 0;
  const y = Math.floor((height - winHeight) / 2);

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: x,
    y: y,
    minWidth: 300,
    minHeight: 600,
    resizable: false,
    maximizable: false,
    frame: false,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      plugins: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Configurar permisos
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'pointerLock'];
    callback(allowedPermissions.includes(permission));
  });

  const pinned = store.get('isPinned', false) || false;
  mainWindow.setAlwaysOnTop(!!pinned);

  mainWindow.loadFile(path.join(__dirname, 'panel.html'));
  
  // Manejar enlaces externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return url.startsWith('https://web.whatsapp.com/') ? { action: 'allow' } : { action: 'deny' };
  });
  
  mainWindow.on('close', () => {
    store.set('windowPosition', mainWindow.getPosition());
  });
}

ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('set-pin-status', (_, status) => {
  store.set('isPinned', !!status);
  if (mainWindow) mainWindow.setAlwaysOnTop(!!status);
});

ipcMain.handle('get-pin-status', () => store.get('isPinned', false));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
