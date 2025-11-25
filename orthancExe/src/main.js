const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const JSON5 = require('json5');
const os = require('os');
const axios = require('axios');
const Store = require('electron-store');

// Initialize Store
const store = new Store();

// -- Configuration --
const PROJECT_ROOT = path.join(__dirname, '..');
const ORTHANC_FOLDER = path.join(PROJECT_ROOT, 'Orthanc-Folder');
// Detects OS for executable name
const ORTHANC_EXE = path.join(ORTHANC_FOLDER, process.platform === 'win32' ? 'Orthanc.exe' : 'Orthanc');
const CONFIG_FILE = path.join(ORTHANC_FOLDER, 'Configuration', 'orthanc.json');
const LUA_FILE = path.join(ORTHANC_FOLDER, 'Configuration', 'tagwrite.lua');

// YOUR AUTH SERVER URL
const AUTH_API_URL = 'http://165.232.189.64/api/auth/lab-login';

let mainWindow;
let orthancProcess = null;

// --- INTERNAL HELPERS ---

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

function updateLuaInternal(creator, organisation) {
    try {
        if (!fs.existsSync(LUA_FILE)) return { success: false, error: `Lua file missing at ${LUA_FILE}` };
        
        let luaContent = fs.readFileSync(LUA_FILE, 'utf8');
        // Regex to find and replace the exact variable definitions
        luaContent = luaContent.replace(/PRIVATE_CREATOR\s*=\s*".*?"/, `PRIVATE_CREATOR = "${creator}"`);
        luaContent = luaContent.replace(/PRIVATE_ORGANISATION\s*=\s*".*?"/, `PRIVATE_ORGANISATION = "${organisation}"`);
        
        fs.writeFileSync(LUA_FILE, luaContent, 'utf8');
        console.log(`[CONFIG] Lua updated: Creator=${creator}, Org=${organisation}`);
        return { success: true };
    } catch (err) {
        console.error('[CONFIG] Lua Write Error:', err);
        return { success: false, error: err.message };
    }
}

function startOrthancInternal() {
    if (orthancProcess && !orthancProcess.killed) {
        // Already running, just notify UI
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-status-changed', 'running');
        return;
    }

    console.log(`[ORTHANC] Starting service...`);
    try {
        orthancProcess = spawn(ORTHANC_EXE, [CONFIG_FILE], { cwd: ORTHANC_FOLDER });

        orthancProcess.stdout.on('data', (d) => { 
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-log', d.toString()); 
        });
        orthancProcess.stderr.on('data', (d) => { 
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-log', d.toString()); 
        });
        orthancProcess.on('close', (code) => { 
            console.log(`[ORTHANC] Exited with code ${code}`);
            orthancProcess = null; 
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-status-changed', 'stopped'); 
        });

        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-status-changed', 'running');
    } catch (e) {
        console.error('[ORTHANC] Start Error:', e);
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server-log', `ERROR STARTING: ${e.message}`);
    }
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        minWidth: 900,
        minHeight: 700,
        backgroundColor: '#1a1a1a',
        autoHideMenuBar: true, // Hides standard Electron menu
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true 
        },
    });

    // Route based on login state
    if (store.get('isLoggedIn')) {
        mainWindow.loadFile(path.join(__dirname, 'index.html'));
    } else {
        mainWindow.loadFile(path.join(__dirname, 'login.html'));
    }
};

app.whenReady().then(() => {

    // --- AUTH HANDLERS ---

    ipcMain.handle('login-attempt', async (event, credentials) => {
        try {
            console.log(`[AUTH] Attempting login for: ${credentials.email}`);
            const response = await axios.post(AUTH_API_URL, credentials);
            const data = response.data;

            if (data.success) {
                // Role Check
                if (data.user.role !== 'lab_staff') {
                     return { success: false, message: 'Access Denied: Lab Staff role required.' };
                }

                const orgId = data.user.organizationIdentifier;
                const labId = data.user.lab?.identifier;

                if (!orgId || !labId) {
                     return { success: false, message: 'Configuration Error: Missing Lab/Org identifiers.' };
                }

                // Update Lua Configuration automatically
                // Mapping: LabID -> Private Creator, OrgID -> Private Organisation
                const configResult = updateLuaInternal(labId, orgId);
                if (!configResult.success) {
                    return { success: false, message: 'Config Update Failed: ' + configResult.error };
                }

                // Save state
                store.set('isLoggedIn', true);
                store.set('userData', { 
                    name: data.user.fullName, 
                    orgId, 
                    labId,
                    token: data.token 
                });

                return { success: true };
            } else {
                return { success: false, message: data.message || 'Invalid credentials.' };
            }
        } catch (error) {
            console.error('[AUTH] Error:', error.message);
            return { success: false, message: 'Cannot connect to login server.' };
        }
    });

    ipcMain.handle('logout', () => {
        store.clear();
        if (orthancProcess) orthancProcess.kill(); // Stop Orthanc on logout
        mainWindow.loadFile(path.join(__dirname, 'login.html'));
        return { success: true };
    });

    ipcMain.handle('get-user-data', () => {
        return store.get('userData');
    });

    // --- ORTHANC & CONFIG HANDLERS ---

    ipcMain.handle('get-local-ip', () => getLocalIP());

    ipcMain.handle('read-config', async () => {
        try {
            if (!fs.existsSync(CONFIG_FILE)) return { error: "Config file missing" };
            return JSON5.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        } catch (err) { return { error: err.message }; }
    });

    // Kept for manual overrides from dashboard if needed
    ipcMain.handle('write-lua', async (event, data) => {
        const res = updateLuaInternal(data.creator, data.organisation);
        if (res.success) return { success: true };
        return { error: res.error };
    });

    ipcMain.handle('read-lua', async () => {
        try {
            if (!fs.existsSync(LUA_FILE)) return { error: "Lua file missing" };
            const content = fs.readFileSync(LUA_FILE, 'utf8');
            return {
                creator: content.match(/PRIVATE_CREATOR\s*=\s*"(.*?)"/)?.[1] || '',
                organisation: content.match(/PRIVATE_ORGANISATION\s*=\s*"(.*?)"/)?.[1] || '',
                fullContent: content
            };
        } catch (err) { return { error: err.message }; }
    });

    ipcMain.on('start-server', () => startOrthancInternal());

    ipcMain.on('stop-server', () => { 
        if (orthancProcess) {
             orthancProcess.kill();
             orthancProcess = null;
        }
    });

    // --- INIT ---
    createWindow();

    // AUTO-START: Only if we are on the dashboard (index.html) and logged in
    mainWindow.webContents.on('did-finish-load', () => {
        const currentURL = mainWindow.webContents.getURL();
        if (store.get('isLoggedIn') && currentURL.endsWith('index.html')) {
             console.log("[AUTOSTART] Dashboard loaded, starting Orthanc...");
             startOrthancInternal();
        }
    });

    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
    if (orthancProcess) orthancProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});