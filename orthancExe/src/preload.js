const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Auth
    login: (creds) => ipcRenderer.invoke('login-attempt', creds),
    logout: () => ipcRenderer.invoke('logout'),
    getUserData: () => ipcRenderer.invoke('get-user-data'),

    // System
    getLocalIP: () => ipcRenderer.invoke('get-local-ip'),

    // Config
    readConfig: () => ipcRenderer.invoke('read-config'),
    // writeConfig disabled in main.js for safety, but you can keep the stub if you want
    readLua: () => ipcRenderer.invoke('read-lua'),
    writeLua: (data) => ipcRenderer.invoke('write-lua', data),

    // Server Control
    startServer: () => ipcRenderer.send('start-server'),
    stopServer: () => ipcRenderer.send('stop-server'),

    // Events
    onServerLog: (callback) => ipcRenderer.on('server-log', (_event, value) => callback(value)),
    onServerStatus: (callback) => ipcRenderer.on('server-status-changed', (_event, value) => callback(value))
});