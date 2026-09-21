import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app, BrowserWindow, dialog, shell } from "electron";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5174;
const ORIGIN = `http://127.0.0.1:${PORT}`;

let apiChild = null;
let spawnedApi = false;
let mainWindow = null;

function tsxCli() {
  return path.join(PROJECT_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
}

async function apiUp() {
  try {
    const res = await fetch(`${ORIGIN}/api/status`);
    return res.ok;
  } catch {
    return false;
  }
}

function startDevApi() {
  const child = spawn(process.execPath, [tsxCli(), path.join(PROJECT_ROOT, "server", "index.ts")], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    windowsHide: true,
  });
  child.on("exit", (code) => {
    if (spawnedApi && code && code !== 0) {
      console.error(`API exited with code ${code}`);
    }
  });
  return child;
}

async function startPackagedApi() {
  process.env.DOTAPLUS_ELECTRON = "1";
  process.env.DOTAPLUS_ROOT = process.resourcesPath;
  process.env.DOTAPLUS_UI = path.join(app.getAppPath(), "dist");
  const bundle = path.join(app.getAppPath(), "electron", "server.bundle.mjs");
  const mod = await import(pathToFileURL(bundle).href);
  await mod.startServer();
}

async function waitForApi() {
  for (let i = 0; i < 50; i++) {
    if (await apiUp()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Local API did not start on 127.0.0.1:5174");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "DotaPlus Local",
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.setAlwaysOnTop(false);
  void win.loadURL(`${ORIGIN}/`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow = win;
}

async function boot() {
  app.setName("DotaPlus Local");
  if (await apiUp()) {
    createWindow();
    return;
  }
  if (app.isPackaged) {
    await startPackagedApi();
  } else {
    spawnedApi = true;
    apiChild = startDevApi();
    await waitForApi();
  }
  createWindow();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.disableHardwareAcceleration();

  app.whenReady().then(() => {
    void boot().catch(async (err) => {
      dialog.showErrorBox("DotaPlus Local", String(err?.message ?? err));
      app.quit();
    });
  });

  app.on("window-all-closed", () => {
    if (spawnedApi && apiChild && !apiChild.killed) apiChild.kill();
    app.quit();
  });
}
