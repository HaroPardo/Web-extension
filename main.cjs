const path = require('path');
const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
const ElectronStore = require('electron-store');

// Environment detection for resource loading
const isPackaged = app.isPackaged;

// Override user agent to prevent WhatsApp compatibility issues (Whatsapp only works on the 60 version or superior)
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
app.disableHardwareAcceleration();  // Improve performance on low-end systems

let mainWindow;
let tray = null;
const store = new ElectronStore();  // Persistent configuration storage

// State tracking for graceful shutdown
app.isQuiting = false;

// Behavior modes when window loses focus
const BLUR_MODES = {
  MINIMIZE: 'minimize',
  CLOSE: 'close'
};


function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height } = primaryDisplay.workAreaSize;
  
  // Default dimensions for initial launch
  const DEFAULT_WIDTH = 400;
  const DEFAULT_HEIGHT = 800;
  
  // Retrieve stored window state or use defaults
  const savedSize = store.get('windowSize', { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const savedPosition = store.get('windowPosition', { 
    x: 0, 
    y: Math.floor((height - DEFAULT_HEIGHT) / 2)  // Center vertically
  });
  
  const blurMode = store.get('blurMode', BLUR_MODES.MINIMIZE);

  const preloadPath = isPackaged 
    ? path.join(process.resourcesPath, 'preload.cjs')
    : path.join(__dirname, 'preload.cjs');
  
  const htmlPath = isPackaged 
    ? path.join(process.resourcesPath, 'panel.html')
    : path.join(__dirname, 'panel.html');

  // Window configuration with frameless design
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
    show: false,
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

  // Show window when rendering is complete
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Permission whitelist for embedded content
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'pointerLock'];
    callback(allowedPermissions.includes(permission));
  });

  const pinned = store.get('isPinned', false) || false;
  mainWindow.setAlwaysOnTop(!!pinned);

  mainWindow.loadFile(htmlPath);
  
  // Security: Restrict child windows to WhatsApp domain only
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return url.startsWith('https://web.whatsapp.com/') ? { action: 'allow' } : { action: 'deny' };
  });
  
  // Persist window state on resize/move
  mainWindow.on('resize', () => store.set('windowSize', mainWindow.getSize()));
  mainWindow.on('move', () => store.set('windowPosition', mainWindow.getPosition()));
  
  
  // Window close handler - prevents actual close when not quitting

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
    store.set('windowSize', mainWindow.getSize());
    store.set('windowPosition', mainWindow.getPosition());
    return false;
  });
  
  // Behavior on focus loss (minimize/hide based on settings)
  mainWindow.on('blur', () => {
    if (store.get('isPinned', false)) return;  // Ignore if pinned
    
    const blurMode = store.get('blurMode', BLUR_MODES.MINIMIZE);
    if (blurMode === BLUR_MODES.MINIMIZE) {
      mainWindow.minimize();
    } else if (blurMode === BLUR_MODES.CLOSE) {
      mainWindow.hide();
    }
  });
  
  // Workaround for Electron window restoration bug
  mainWindow.on('restore', () => {
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({ ...bounds, width: bounds.width + 1, height: bounds.height + 1 });
    setTimeout(() => {
      mainWindow.setBounds(bounds);
      mainWindow.focus();
    }, 50);
  });

  // Tray interaction handling
  mainWindow.on('show', () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
}

 // Creates system tray icon with context menu

function createTray() {
  const iconPath = isPackaged 
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, 'icon.ico');
  
  try {
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open WhatsApp',
        click: () => mainWindow.show()
      },
      {
        label: 'Exit',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('WhatsApp Sidebar');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
    
    tray.on('double-click', () => {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
    });
    
  } catch (error) {
    console.error('Tray creation failed:', error);
  }
}

// Application lifecycle management
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// IPC handlers for window management
ipcMain.on('window-close', () => {
  app.isQuiting = true;
  mainWindow?.close();
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('set-pin-status', (_, status) => {
  store.set('isPinned', !!status);
  mainWindow?.setAlwaysOnTop(!!status);
});
ipcMain.on('set-blur-mode', (_, mode) => store.set('blurMode', mode));
ipcMain.handle('get-pin-status', () => store.get('isPinned', false));
ipcMain.handle('get-blur-mode', () => store.get('blurMode', BLUR_MODES.MINIMIZE));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
