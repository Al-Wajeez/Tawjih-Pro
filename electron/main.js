const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const {autoUpdate, autoUpdater} = require('electron-updater')
const log = require('electron-log')
log.transports.file.resolvePath = () => path.join('E:\My New Website\Tawjih-Pro', 'log/main.log')
log.info('hello, log')
log.warn('Some problem appears');

// Correct environment detection
// isPackaged will be false when running with electron .
// So we need to check NODE_ENV and command line flags
const hasProdFlag = process.argv.includes('--prod');
const isNODE_ENV_Production = process.env.NODE_ENV === 'production';

// If we have production flag OR NODE_ENV=production, treat as production
// Otherwise, treat as development
const isProductionMode = hasProdFlag || isNODE_ENV_Production;
const isDevMode = !isProductionMode;

console.log('=== ENVIRONMENT INFO ===');
console.log('app.isPackaged:', app.isPackaged);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('hasProdFlag:', hasProdFlag);
console.log('isNODE_ENV_Production:', isNODE_ENV_Production);
console.log('isProductionMode:', isProductionMode);
console.log('isDevMode:', isDevMode);
console.log('argv:', process.argv);
console.log('========================');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: "Tawjih Pro",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: true, // Keep DevTools enabled for debugging
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false,
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // Handle file downloads
  win.webContents.session.on('will-download', (event, item, webContents) => {
    // Download handling
  });

  // Open external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Define file path
  const indexPath = path.join(__dirname, '../dist/index.html');
  console.log('Looking for index.html at:', indexPath);
  console.log('File exists:', fs.existsSync(indexPath));
  
  // List what's in dist folder
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    console.log('Files in dist/:');
    fs.readdirSync(distPath).forEach(file => {
      console.log('  -', file);
    });
  }

  // Load logic
  if (isProductionMode) {
    console.log('PRODUCTION MODE: Loading from dist folder');
    
    if (fs.existsSync(indexPath)) {
      win.loadFile(indexPath).catch(err => {
        console.error('Failed to load file:', err);
        win.loadURL(`data:text/html,<h1>File Load Error</h1><pre>${err.message}</pre>`);
      });
    } else {
      console.error('ERROR: index.html not found in dist folder');
      win.loadURL(`data:text/html,<h1>Build Required</h1>
        <p>Please run: npm run build</p>
        <p>Expected: ${indexPath}</p>`);
    }
  } else {
    console.log('DEVELOPMENT MODE: Trying dev server');
    win.loadURL('http://localhost:5173').catch(err => {
      console.error('Dev server failed, trying dist as fallback:', err.message);
      
      if (fs.existsSync(indexPath)) {
        console.log('Fallback: Loading from dist folder');
        win.loadFile(indexPath).catch(err2 => {
          console.error('Also failed to load from file:', err2);
        });
      } else {
        console.error('No dist folder available');
      }
    });
  }

  // Always open DevTools for now
  win.webContents.openDevTools({ mode: 'detach' });
}

// App Lifecycle
app.whenReady().then(createWindow, autoUpdater.checkForUpdatesAndNotify);

autoUpdater.on('update-available',()=>{
  log.info('update available')
})

autoUpdater.on('checking-for-update',()=>{
  log.info('checking for update')
})

autoUpdater.on('download-progress',()=>{
  log.info('download progress')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});