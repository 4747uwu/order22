const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const JSON5 = require('json5');
const os = require('os'); // NEW: Import 'os' module

// -- Configuration --
const PROJECT_ROOT = path.join(__dirname, '..');
const ORTHANC_FOLDER = path.join(PROJECT_ROOT, 'Orthanc-Folder');
const ORTHANC_EXE = path.join(ORTHANC_FOLDER, process.platform === 'win32' ? 'Orthanc.exe' : 'Orthanc');
const CONFIG_FILE = path.join(ORTHANC_FOLDER, 'Configuration', 'orthanc.json');
const LUA_FILE = path.join(ORTHANC_FOLDER, 'Configuration', 'tagwrite.lua');

let mainWindow;
let orthancProcess = null;

// --- NEW HELPER: Get Local IP Address ---
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback to localhost
}

const createWindow = () => {
// ... existing window creation code ...
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 900,
    minHeight: 700,
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

app.whenReady().then(() => {

  // --- IPC Handlers ---

  // 0. NEW HANDLER: Get IP
  ipcMain.handle('get-local-ip', () => {
      return getLocalIP();
  });

  // 1. READ CONFIG (JSON)
// ... existing handlers ...
  ipcMain.handle('read-config', async () => {
    try {
      if (!fs.existsSync(CONFIG_FILE)) return { error: `Config file not found at: ${CONFIG_FILE}` };
      const rawData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON5.parse(rawData);
    } catch (err) {
      return { error: `Config Error: ${err.message}` };
    }
  });

// ... rest of existing main.js code ...
  ipcMain.handle('write-config', async (event, newConfig) => {
     return { error: "JSON saving temporarily disabled to protect file comments." };
  });

  ipcMain.handle('read-lua', async () => {
    try {
        if (!fs.existsSync(LUA_FILE)) return { error: `Lua file not found at: ${LUA_FILE}` };
        const luaContent = fs.readFileSync(LUA_FILE, 'utf8');
        const creatorMatch = luaContent.match(/PRIVATE_CREATOR\s*=\s*"(.*?)"/);
        const orgMatch = luaContent.match(/PRIVATE_ORGANISATION\s*=\s*"(.*?)"/);
        return {
            creator: creatorMatch ? creatorMatch[1] : '',
            organisation: orgMatch ? orgMatch[1] : '',
            fullContent: luaContent
        };
    } catch (err) {
        return { error: `Lua Read Error: ${err.message}` };
    }
  });

  ipcMain.handle('write-lua', async (event, data) => {
    try {
        if (!fs.existsSync(LUA_FILE)) return { error: `Lua file missing` };
        let luaContent = fs.readFileSync(LUA_FILE, 'utf8');
        luaContent = luaContent.replace(/PRIVATE_CREATOR\s*=\s*".*?"/, `PRIVATE_CREATOR = "${data.creator}"`);
        luaContent = luaContent.replace(/PRIVATE_ORGANISATION\s*=\s*".*?"/, `PRIVATE_ORGANISATION = "${data.organisation}"`);
        fs.writeFileSync(LUA_FILE, luaContent, 'utf8');
        return { success: true };
    } catch (err) {
        return { error: `Lua Write Error: ${err.message}` };
    }
  });

  ipcMain.on('start-server', (event) => {
    if (orthancProcess) return;
    console.log(`Starting Orthanc...`);
    try {
        orthancProcess = spawn(ORTHANC_EXE, [CONFIG_FILE], { cwd: ORTHANC_FOLDER });
        orthancProcess.stdout.on('data', (d) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-log', d.toString()); });
        orthancProcess.stderr.on('data', (d) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-log', d.toString()); });
        orthancProcess.on('close', () => { orthancProcess = null; if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-status-changed', 'stopped'); });
        mainWindow.webContents.send('server-status-changed', 'running');
    } catch (e) {
        mainWindow.webContents.send('server-log', `ERROR STARTING: ${e.message}`);
    }
  });

  ipcMain.on('stop-server', () => { if (orthancProcess) { orthancProcess.kill(); orthancProcess = null; } });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (orthancProcess) orthancProcess.kill(); if (process.platform !== 'darwin') app.quit(); });