const path = require('path');
const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
const ElectronStore = require('electron-store');

const isPackaged = app.isPackaged;

app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
app.disableHardwareAcceleration();

let mainWindow;
let tray = null;
const store = new ElectronStore();

// Variable para controlar el cierre
app.isQuiting = false;

const BLUR_MODES = {
  MINIMIZE: 'minimize',
  CLOSE: 'close'
};

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height } = primaryDisplay.workAreaSize;
  
  const DEFAULT_WIDTH = 400;
  const DEFAULT_HEIGHT = 800;
  
  const savedSize = store.get('windowSize', { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  
  const savedPosition = store.get('windowPosition', { 
    x: 0, 
    y: Math.floor((height - DEFAULT_HEIGHT) / 2)
  });
  
  const blurMode = store.get('blurMode', BLUR_MODES.MINIMIZE);

  const preloadPath = isPackaged 
    ? path.join(process.resourcesPath, 'preload.cjs')
    : path.join(__dirname, 'preload.cjs');
  
  const htmlPath = isPackaged 
    ? path.join(process.resourcesPath, 'panel.html')
    : path.join(__dirname, 'panel.html');

  mainWindow = new BrowserWindow({
    width: savedSize.width,
    height: savedSize.height,
    x: savedPosition.x,
    y: savedPosition.y,
    minWidth: 300,
    minHeight: 600,
    resizable: true,
    maximizable: false,
    frame: false,
    movable: true,
    backgroundColor: '#2a2b3a',
    show: false, // No mostrar inmediatamente
    webPreferences: {
      preload: preloadPath,
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

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'pointerLock'];
    callback(allowedPermissions.includes(permission));
  });

  const pinned = store.get('isPinned', false) || false;
  mainWindow.setAlwaysOnTop(!!pinned);

  mainWindow.loadFile(htmlPath);
  
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return url.startsWith('https://web.whatsapp.com/') ? { action: 'allow' } : { action: 'deny' };
  });
  
  mainWindow.on('resize', () => {
    store.set('windowSize', mainWindow.getSize());
  });
  
  mainWindow.on('move', () => {
    store.set('windowPosition', mainWindow.getPosition());
  });
  
  // Manejar el cierre: si no es una salida real, ocultamos
  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
    // Guardar tamaño y posición
    store.set('windowSize', mainWindow.getSize());
    store.set('windowPosition', mainWindow.getPosition());
    return false;
  });
  
  mainWindow.on('blur', () => {
    const isPinned = store.get('isPinned', false);
    const blurMode = store.get('blurMode', BLUR_MODES.MINIMIZE);
    
    if (isPinned) return;
    
    if (blurMode === BLUR_MODES.MINIMIZE) {
      mainWindow.minimize();
    } else if (blurMode === BLUR_MODES.CLOSE) {
      mainWindow.hide();
    }
  });
  
  // Solución para el bug de restauración
  mainWindow.on('restore', () => {
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({ 
      ...bounds, 
      width: bounds.width + 1,
      height: bounds.height + 1
    });
    setTimeout(() => {
      mainWindow.setBounds(bounds);
      mainWindow.focus();
    }, 50);
  });

  // Manejar clic en el icono de la bandeja
  mainWindow.on('show', () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
}

// Crear bandeja del sistema
function createTray() {
  // Ruta al icono
  const iconPath = isPackaged 
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, 'icon.ico');
  
  try {
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir WhatsApp',
        click: () => {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: 'Salir',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('WhatsApp Sidebar');
    tray.setContextMenu(contextMenu);
    
    // Comportamiento para clic simple (Windows)
    tray.on('click', () => {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    
    // Comportamiento para doble clic (macOS/Linux)
    tray.on('double-click', () => {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    });
    
  } catch (error) {
    console.error('Error creating tray:', error);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Manejar activación de la app (especialmente en macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.on('window-close', () => {
  app.isQuiting = true;
  mainWindow?.close();
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());

ipcMain.on('set-pin-status', (_, status) => {
  store.set('isPinned', !!status);
  if (mainWindow) mainWindow.setAlwaysOnTop(!!status);
});

ipcMain.on('set-blur-mode', (_, mode) => {
  store.set('blurMode', mode);
});

ipcMain.handle('get-pin-status', () => store.get('isPinned', false));
ipcMain.handle('get-blur-mode', () => store.get('blurMode', BLUR_MODES.MINIMIZE));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
