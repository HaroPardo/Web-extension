const path = require('path');
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, session } = require('electron');
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

// ----------------- Ajuste del userData para evitar OneDrive / Desktop locks -----------------
try {
  const userDataPath = path.join(app.getPath('appData'), 'SocialSidebar');
  app.setPath('userData', userDataPath);
  console.log('userData path set to', app.getPath('userData'));
} catch (err) {
  console.warn('No se pudo cambiar userData path, se usará el predeterminado:', err);
}

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
      // Inform renderer that the window is being hidden (renderer can pause webview if needed)
      try { mainWindow.webContents.send('app-hide'); } catch (err) {}
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

  // Log potential session path for debugging
  try {
    console.log('WhatsApp storage path (session):', session.fromPartition('persist:whatsapp').getUserAgent ? 'session-ok' : 'session-created');
  } catch (err) {
    console.warn('No se pudo inspeccionar la sesión persist:whatsapp', err);
  }
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
        label: 'Reset WhatsApp session',
        click: async () => {
          try {
            const s = session.fromPartition('persist:whatsapp');
            await s.clearStorageData({ storages: ['serviceworkers','caches','indexdb','localstorage','cookies'] });
            await s.clearCache();
            // If window exists, reload webview via renderer
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('force-reload-webview');
          } catch (err) {
            console.error('Error reseteando session desde tray:', err);
          }
        }
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
app.whenReady().then(async () => {
  // NOTA: ya no limpiamos la sesión automáticamente al inicio para preservar el login.
  // En su lugar, proporcionamos un botón/IPC para reset manual en caso de corrupción.

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

// IPC: limpiar session WhatsApp a demanda
ipcMain.handle('clear-whatsapp-session', async () => {
  try {
    const s = session.fromPartition('persist:whatsapp');
    await s.clearStorageData({ storages: ['serviceworkers','caches','indexdb','localstorage','cookies'] });
    await s.clearCache();
    return { ok: true };
  } catch (err) {
    console.error('clear-whatsapp-session failed:', err);
    return { ok: false, error: String(err) };
  }
});

// Provide userData path for debugging desde renderer si se necesita
ipcMain.handle('get-userdata-path', () => app.getPath('userData'));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
