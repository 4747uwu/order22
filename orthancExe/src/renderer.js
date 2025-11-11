// --- DOM Elements ---
const footer = document.querySelector('footer');
const ipInput = document.getElementById('config-ip');
const portInput = document.getElementById('config-port');
const luaCreatorInput = document.getElementById('lua-creator');
const luaOrgInput = document.getElementById('lua-org');
const saveBtn = document.getElementById('btn-save');
const toggleServerBtn = document.getElementById('btn-toggle-server');
const statusBadge = document.getElementById('status-badge');
const logOutput = document.getElementById('log-output');

// Navigation Elements
const navSettings = document.getElementById('nav-settings');
const navExplorer = document.getElementById('nav-explorer');
const tabSettings = document.getElementById('tab-settings');
const tabExplorer = document.getElementById('tab-explorer');
const webview = document.getElementById('orthanc-webview');

// Auth & Header Elements
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');

let isRunning = false;
let httpPort = 8042;

// --- AUTH & INITIALIZATION ---

// 1. Display User Info on Load
async function initUser() {
    try {
        // Check if we can get user data (assumes already logged in if on this page)
        // You might need to add a 'getUserData' to your preload/main if not already there.
        // For now, we'll assume it's stored or passed.
        // If you added getUserData to preload, uncomment below:
        /*
        const userData = await window.api.getUserData();
        if (userData && userData.name) {
             userDisplay.textContent = `Logged in as: ${userData.name}`;
        }
        */
    } catch (e) {
        console.error("Error fetching user data:", e);
    }
}

// 2. Logout Handler
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        const confirmLogout = confirm('Are you sure you want to logout? This will stop the Orthanc server.');
        if (confirmLogout) {
            await window.api.logout();
            // Main process handles navigation back to login.html
        }
    });
}

// --- TAB SWITCHING ---
function switchTab(tabName) {
    if (tabName === 'settings') {
        tabSettings.classList.add('active');
        tabExplorer.classList.remove('active');
        navSettings.classList.add('active');
        navExplorer.classList.remove('active');
        footer.style.display = 'flex';
    } else {
        tabSettings.classList.remove('active');
        tabExplorer.classList.add('active');
        navSettings.classList.remove('active');
        navExplorer.classList.add('active');
        footer.style.display = 'none';
    }
}

navSettings.addEventListener('click', () => switchTab('settings'));
navExplorer.addEventListener('click', () => switchTab('explorer'));

// --- WEBVIEW CUSTOMIZATION ---
webview.addEventListener('dom-ready', () => {
    webview.insertCSS(`
        #custom-logo-cover {
            position: absolute; top: 0; left: 0; width: 260px; height: 80px;
            background-color: #2c3e50; z-index: 9999; display: flex;
            align-items: center; justify-content: center; color: white;
            font-family: sans-serif; font-size: 1.2rem; font-weight: bold;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
    `);
    webview.executeJavaScript(`
        if (!document.getElementById('custom-logo-cover')) {
            const cover = document.createElement('div');
            cover.id = 'custom-logo-cover';
            cover.innerText = 'LAB CONNECTOR'; // Changed branding to match context
            document.body.appendChild(cover);
        }
    `);
});

// --- DATA LOADING ---
async function loadAll() {
    // 1. Load and display Local IP
    const localIP = await window.api.getLocalIP(); // UPDATED to match new preload 'api'
    if (ipInput) ipInput.value = localIP;

    // 2. Load Port from Config
    const config = await window.api.readConfig(); // UPDATED to match new preload 'api'
    if (!config.error) {
        if (portInput) portInput.value = config.HttpPort || 8042;
        httpPort = config.HttpPort || 8042;
    } else {
        log(`JSON LOAD ERROR: ${config.error}`);
    }

    // 3. Load Lua
    const luaData = await window.api.readLua(); // UPDATED to match new preload 'api'
    if (!luaData.error) {
        if (luaCreatorInput) luaCreatorInput.value = luaData.creator;
        if (luaOrgInput) luaOrgInput.value = luaData.organisation;
        log("Configuration & Lua script loaded.");
    } else {
        log(`LUA LOAD ERROR: ${luaData.error}`);
    }
}

// --- ORTHANC CONTROL EVENTS ---
if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const luaData = { creator: luaCreatorInput.value, organisation: luaOrgInput.value };
        const result = await window.api.writeLua(luaData); // UPDATED to match new preload 'api'
        if (result.success) {
            log("Lua script manually updated.");
            saveBtn.innerText = "Saved!";
            setTimeout(() => saveBtn.innerText = "Save Lua Settings", 2000);
        } else {
            log(`ERROR SAVING LUA: ${result.error}`);
        }
    });
}

toggleServerBtn.addEventListener('click', () => {
    if (!isRunning) window.api.startServer(); // UPDATED to match new preload 'api'
    else window.api.stopServer(); // UPDATED to match new preload 'api'
});

// --- STATUS & LOGGING HANDLERS ---
window.api.onServerStatus((newStatus) => { // UPDATED to match new preload 'api'
    isRunning = (newStatus === 'running');
    if (isRunning) {
        statusBadge.innerText = "Running";
        statusBadge.className = "status-running";
        toggleServerBtn.innerText = "Stop Server";
        toggleServerBtn.classList.remove('start');
        toggleServerBtn.classList.add('stop');
        navExplorer.disabled = false;
        // Optionally auto-switch to explorer on start if you prefer
        // switchTab('explorer'); 
        setTimeout(() => {
             webview.src = `http://localhost:${httpPort}/ui/app/`;
             log(`Explorer loaded at port ${httpPort}`);
        }, 1500);
    } else {
        statusBadge.innerText = "Stopped";
        statusBadge.className = "status-stopped";
        toggleServerBtn.innerText = "Start Server";
        toggleServerBtn.classList.remove('stop');
        toggleServerBtn.classList.add('start');
        navExplorer.disabled = true;
        webview.src = 'about:blank';
        switchTab('settings');
    }
});

window.api.onServerLog(log); // UPDATED to match new preload 'api'

function log(msg) {
    if (footer && footer.style.display !== 'none') {
        logOutput.innerText += msg + '\n';
        logOutput.scrollTo({ top: logOutput.scrollHeight, behavior: 'smooth' });
    }
}

// Initialize
initUser();
loadAll();