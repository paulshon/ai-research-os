/**
 * Preload Script — Security Bridge
 * Migrated from original ai-research-studio preload/index.ts
 * Extended with Local First filesystem APIs
 */

import { contextBridge, ipcRenderer } from "electron";

const api = {
  platform: process.platform,

  // ── Settings (from original) ──
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (s: { apiKey?: string; model?: string }) =>
      ipcRenderer.invoke("settings:set", s),
  },

  // ── Projects (from original) ──
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    save: (projects: unknown[]) => ipcRenderer.invoke("projects:save", projects),
  },

  // ── Dialogs (from original) ──
  dialog: {
    openFile: (opts: { filters?: { name: string; extensions: string[] }[] }) =>
      ipcRenderer.invoke("dialog:openFile", opts),
    saveFile: (opts: { defaultPath?: string; content: string }) =>
      ipcRenderer.invoke("dialog:saveFile", opts),
  },

  // ── File System (from original + new) ──
  fs: {
    readFileBase64: (filePath: string) =>
      ipcRenderer.invoke("fs:readFileBase64", filePath),
    selectResearchFolder: () =>
      ipcRenderer.invoke("fs:selectResearchFolder"),
    listLocalFiles: (folderPath: string) =>
      ipcRenderer.invoke("fs:listLocalFiles", folderPath),
    writeLocalFile: (filePath: string, content: string) =>
      ipcRenderer.invoke("fs:writeLocalFile", filePath, content),
    readLocalFile: (filePath: string) =>
      ipcRenderer.invoke("fs:readLocalFile", filePath),
  },

  // ── PDF (from original) ──
  pdf: {
    extractText: (filePath: string) =>
      ipcRenderer.invoke("pdf:extractText", filePath),
    extractFromBase64: (base64: string) =>
      ipcRenderer.invoke("pdf:extractFromBase64", base64),
  },

  // ── Window Controls (from original) ──
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximizeToggle: () => ipcRenderer.send("window:maximize-toggle"),
    fullscreenToggle: () => ipcRenderer.send("window:fullscreen-toggle"),
    close: () => ipcRenderer.send("window:close"),
  },

  // ── Sync ──
  sync: {
    status: () => ipcRenderer.invoke("sync:status"),
    trigger: () => ipcRenderer.invoke("sync:trigger"),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
