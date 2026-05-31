/**
 * AI Research OS — Electron Main Process
 * ========================================
 * Migrated from ai-research-studio (2).
 * Now connects to:
 *   - Vercel (web UI via BrowserWindow loading remote URL or local renderer)
 *   - Railway (FastAPI via HTTP for AI)
 *   - Supabase (Auth + DB sync)
 *   - Local filesystem (Local First storage)
 */

import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc";
import { initLocalFileSystem } from "../filesystem/local-fs";
import { initSyncEngine } from "../sync/sync-engine";

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === "development";
const WEB_URL = process.env.WEB_URL || "http://localhost:3000";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Register all IPC handlers (file access, PDF, settings, etc.)
    registerIpcHandlers();

    // Initialize local filesystem watcher
    await initLocalFileSystem();

    // Initialize cloud sync engine
    await initSyncEngine();

    // Create main window
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 960,
      minHeight: 640,
      show: false,
      frame: false,
      backgroundColor: "#0d0f14",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    mainWindow.once("ready-to-show", () => mainWindow?.show());

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: "deny" };
    });

    // In production, load the deployed web app
    // In dev, load localhost
    if (isDev) {
      void mainWindow.loadURL(WEB_URL);
    } else {
      void mainWindow.loadURL(WEB_URL);
    }

    mainWindow.on("closed", () => {
      mainWindow = null;
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        // Re-create window
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
