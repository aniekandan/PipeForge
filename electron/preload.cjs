/**
 * Electron Preload script
 * Bridges native OS file picker, physical disk read/write, window controls, and file association events to the renderer window
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  getDocumentsPath: () => ipcRenderer.invoke('app:getDocumentsPath'),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  getInitialFile: () => ipcRenderer.invoke('app:getInitialFile'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall'),
  onOpenFile: (callback) => {
    const listener = (_event, filePath) => callback(filePath);
    ipcRenderer.on('app:open-file', listener);
    return () => ipcRenderer.removeListener('app:open-file', listener);
  },
});
