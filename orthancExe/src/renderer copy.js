// --- DOM Elements ---
const footer = document.querySelector('footer');
const nameInput = document.getElementById('config-name');
const portInput = document.getElementById('config-port');
const luaCreatorInput = document.getElementById('lua-creator');
const luaOrgInput = document.getElementById('lua-org');
const saveBtn = document.getElementById('btn-save');
const toggleServerBtn = document.getElementById('btn-toggle-server');
const statusBadge = document.getElementById('status-badge');
const logOutput = document.getElementById('log-output');

const navSettings = document.getElementById('nav-settings');
const navExplorer = document.getElementById('nav-explorer');
const tabSettings = document.getElementById('tab-settings');
const tabExplorer = document.getElementById('tab-explorer');
const webview = document.getElementById('orthanc-webview');

let isRunning = false;
let httpPort = 8042;

// --- Tab Switching ---
function switchTab(tabName) {
    if (tabName === 'settings') {
        tabSettings.classList.add('active');
        tabExplorer.classList.remove('active');
        navSettings.classList.add('active');
        navExplorer.classList.remove('active');
        // Show footer
        footer.style.display = 'flex';
    } else {
        tabSettings.classList.remove('active');
        tabExplorer.classList.add('active');
        navSettings.classList.remove('active');
        navExplorer.classList.add('active');
        // HARD hide footer to ensure full screen
        footer.style.display = 'none';
    }
}

navSettings.addEventListener('click', () => switchTab('settings'));
navExplorer.addEventListener('click', () => switchTab('explorer'));

// --- Data Loading ---
async function loadAll() {
  const config = await window.orthancApi.readConfig();
  if (!config.error) {
      nameInput.value = config.Name || 'Orthanc';
      portInput.value = config.HttpPort || 8042;
      httpPort = config.HttpPort || 8042; 
  } else {
      log(`JSON LOAD ERROR: ${config.error}`);
  }

  const luaData = await window.orthancApi.readLua();
  if (!luaData.error) {
      luaCreatorInput.value = luaData.creator;
      luaOrgInput.value = luaData.organisation;
      log("Configuration & Lua script loaded.");
  } else {
      log(`LUA LOAD ERROR: ${luaData.error}`);
  }
}

// --- Event Listeners ---
saveBtn.addEventListener('click', async () => {
    const luaData = {
        creator: luaCreatorInput.value,
        organisation: luaOrgInput.value
    };
    const result = await window.orthancApi.writeLua(luaData);
    if (result.success) {
        log("Lua script updated successfully.");
        saveBtn.innerText = "Saved!";
        setTimeout(() => saveBtn.innerText = "Save Lua Settings", 2000);
    } else {
        log(`ERROR SAVING LUA: ${result.error}`);
    }
});

toggleServerBtn.addEventListener('click', () => {
  if (!isRunning) {
    window.orthancApi.startServer();
  } else {
    window.orthancApi.stopServer();
  }
});

// --- Status & Logging ---
window.orthancApi.onStatusChange((newStatus) => {
  isRunning = (newStatus === 'running');
  if (isRunning) {
    statusBadge.innerText = "Running";
    statusBadge.className = "status-running";
    toggleServerBtn.innerText = "Stop Server";
    toggleServerBtn.classList.remove('start'); toggleServerBtn.classList.add('stop');

    navExplorer.disabled = false;
    navExplorer.innerText = "Explorer";
    
    // Auto-load explorer URL after a short delay to let server boot
    setTimeout(() => {
        webview.src = `http://localhost:${httpPort}/ui/app/`;
        log(`Explorer loaded at port ${httpPort}`);
        // Optional: Auto-switch to explorer tab on start?
        // switchTab('explorer'); 
    }, 1500);

  } else {
    statusBadge.innerText = "Stopped";
    statusBadge.className = "status-stopped";
    toggleServerBtn.innerText = "Start Server";
    toggleServerBtn.classList.remove('stop'); toggleServerBtn.classList.add('start');

    navExplorer.disabled = true;
    navExplorer.innerText = "Explorer (Start Server First)";
    webview.src = 'about:blank';
    switchTab('settings'); 
  }
});

window.orthancApi.onLog(log);
function log(msg) {
  // Only append logs if footer is visible to avoid performance hit when hidden
  if (footer.style.display !== 'none') {
      logOutput.innerText += msg + '\n';
      logOutput.scrollTo({ top: logOutput.scrollHeight, behavior: 'smooth' });
  }
}

loadAll();