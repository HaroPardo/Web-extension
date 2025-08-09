const path = require('path');
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const ElectronStore = require('electron-store');

app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

app.disableHardwareAcceleration();

let mainWindow;
const store = new ElectronStore();

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Usar tamaño guardado o valores predeterminados
  const savedSize = store.get('windowSize', { width: 520, height: 800 });
  const savedPosition = store.get('windowPosition', { x: 0, y: Math.floor((height - 800) / 2) });

  mainWindow = new BrowserWindow({
    width: savedSize.width,
    height: savedSize.height,
    x: savedPosition.x,
    y: savedPosition.y,
    minWidth: 300,  // Ancho mínimo
    minHeight: 600, // Alto mínimo
    resizable: true, // ¡Habilitar redimensión!
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
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      enableBlinkFeatures: 'OverlayScrollbars'
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
  
  // Guardar tamaño y posición al cambiar o cerrar
  mainWindow.on('resize', () => {
    store.set('windowSize', mainWindow.getSize());
  });
  
  mainWindow.on('move', () => {
    store.set('windowPosition', mainWindow.getPosition());
  });
  
  mainWindow.on('close', () => {
    store.set('windowSize', mainWindow.getSize());
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
