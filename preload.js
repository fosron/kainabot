const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getPrices: () => ipcRenderer.invoke('get-prices'),
  getInitialPrices: () => ipcRenderer.invoke('get-initial-prices'),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  onSystemThemeChanged: (callback) => ipcRenderer.on('system-theme-changed', (event, theme) => callback(theme)),
  closeApp: () => ipcRenderer.send('close-app'),
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
  getAutoReloadConfig: () => ipcRenderer.invoke('get-auto-reload-config'),
  setAutoReloadConfig: (config) => ipcRenderer.send('set-auto-reload-config', config),
  onAutoReloadTriggered: (callback) => ipcRenderer.on('auto-reload-triggered', () => callback()),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.send('set-settings', settings),
  onShowSettingsPage: (callback) => ipcRenderer.on('show-settings-page', () => callback()),
});
