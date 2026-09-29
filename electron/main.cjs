/**
 * Electron Main Process Entry
 * Manages native frameless desktop window, IPC channels, physical file system persistence,
 * and automatic .pipeforge file association handlers.
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');

// Remove default Windows / Electron application menu bar (File, Edit, View, Help, etc.)
Menu.setApplicationMenu(null);

let mainWindow = null;
let initialFilePath = null;

// Helper to extract a supported project or data file path from process command-line arguments
function extractFilePathFromArgv(argv) {
  if (!argv || !Array.isArray(argv)) return null;
  // Look for any arguments ending in .pipeforge, .xlsx, or .csv (ignoring electron runtime flags)
  const candidate = argv.find((arg) => {
    if (!arg || typeof arg !== 'string') return false;
    const clean = arg.trim().toLowerCase();
    if (clean.startsWith('--') || clean.startsWith('-')) return false;
    return clean.endsWith('.pipeforge') || clean.endsWith('.xlsx') || clean.endsWith('.csv');
  });
  return candidate || null;
}

// Check initial argv for file association launch
initialFilePath = extractFilePathFromArgv(process.argv);

// Enforce single instance lock so double-clicking a .pipeforge file focuses existing app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // When a second instance is launched (e.g. double-clicking a .pipeforge file while app is open)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const openedFile = extractFilePathFromArgv(commandLine);
      if (openedFile) {
        mainWindow.webContents.send('app:open-file', openedFile);
      }
    }
  });

  // macOS open-file event handler
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app:open-file', filePath);
    } else {
      initialFilePath = filePath;
    }
  });

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 850,
      minWidth: 900,
      minHeight: 650,
      title: 'PipeForge',
      backgroundColor: '#f9fbfd',
      icon: path.join(__dirname, '../public/favicon.ico'),
      frame: false, // Removes default OS window frame / chrome
      autoHideMenuBar: true, // Hides default OS menu bar
      titleBarStyle: 'hidden', // Uses custom in-app title bar
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Provide initial file path to renderer if launched via file association
    ipcMain.handle('app:getInitialFile', () => {
      const file = initialFilePath;
      initialFilePath = null; // consume once
      return file;
    });

    // Window controls for custom in-app TitleBar
    ipcMain.handle('window:minimize', () => {
      if (mainWindow) {
        mainWindow.minimize();
      }
    });

    ipcMain.handle('window:maximize', () => {
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
      return mainWindow ? mainWindow.isMaximized() : false;
    });

    ipcMain.handle('window:isMaximized', () => {
      return mainWindow ? mainWindow.isMaximized() : false;
    });

    ipcMain.handle('window:close', () => {
      if (mainWindow) {
        mainWindow.close();
      }
    });

    ipcMain.handle('app:quitAndInstall', () => {
      app.quit();
    });

    // Handle native OS open file dialog
    ipcMain.handle('dialog:openFile', async (_event, options) => {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: options?.filters || [
          { name: 'PipeForge Projects & Spreadsheets', extensions: ['pipeforge', 'xlsx', 'csv'] },
          { name: 'PipeForge Project Packages (*.pipeforge)', extensions: ['pipeforge'] },
          { name: 'Excel / CSV Spreadsheets', extensions: ['xlsx', 'csv'] },
        ],
      });
      return result;
    });

    // Handle selecting a save folder
    ipcMain.handle('dialog:selectDirectory', async () => {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
      });
      return result.canceled ? null : result.filePaths[0];
    });

    // Returns default PipeForge Projects folder in OS Documents directory
    ipcMain.handle('app:getDocumentsPath', async () => {
      const docs = app.getPath('documents');
      const targetDir = path.join(docs, 'PipeForge Projects');
      try {
        await fs.mkdir(targetDir, { recursive: true });
      } catch {
        // Ignore if exists
      }
      return targetDir;
    });

    // Handle reading file bytes directly from local filesystem in Electron
    ipcMain.handle('fs:readFile', async (_event, filePath) => {
      const buffer = await fs.readFile(filePath);
      return buffer.buffer;
    });

    // Handle writing file bytes directly to local filesystem in Electron
    ipcMain.handle('fs:writeFile', async (_event, filePath, bufferData) => {
      const targetDir = path.dirname(filePath);
      await fs.mkdir(targetDir, { recursive: true });
      const buffer = Buffer.from(bufferData);
      await fs.writeFile(filePath, buffer);
      return true;
    });

    // Handle deleting physical file
    ipcMain.handle('fs:deleteFile', async (_event, filePath) => {
      try {
        await fs.unlink(filePath);
        return true;
      } catch {
        return false;
      }
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
