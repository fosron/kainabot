const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getPrices: () => ipcRenderer.invoke('get-prices'),
  getInitialPrices: () => ipcRenderer.invoke('get-initial-prices'),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  onSystemThemeChanged: (callback) => ipcRenderer.on('system-theme-changed', (event, theme) => callback(theme)),
  closeApp: () => ipcRenderer.send('close-app'),
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
});
