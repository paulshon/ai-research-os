/**
 * IPC Handlers — migrated from original ai-research-studio
 * Extended with Local First filesystem + sync capabilities
 */

import { BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

export const IPC = {
  // Original channels (from ai-research-studio)
  settingsGet: "settings:get",
  settingsSet: "settings:set",
  projectsList: "projects:list",
  projectsSave: "projects:save",
  dialogOpenFile: "dialog:openFile",
  dialogSaveFile: "dialog:saveFile",
  readFileBase64: "fs:readFileBase64",
  pdfExtractText: "pdf:extractText",
  pdfExtractFromBase64: "pdf:extractFromBase64",
  windowMinimize: "window:minimize",
  windowMaximizeToggle: "window:maximize-toggle",
  windowFullscreenToggle: "window:fullscreen-toggle",
  windowClose: "window:close",

  // New Local First channels
  selectResearchFolder: "fs:selectResearchFolder",
  listLocalFiles: "fs:listLocalFiles",
  writeLocalFile: "fs:writeLocalFile",
  readLocalFile: "fs:readLocalFile",
  watchFolder: "fs:watchFolder",
  syncStatus: "sync:status",
  syncTrigger: "sync:trigger",
} as const;

export function registerIpcHandlers(): void {
  // ── Window Controls (from original) ──
  ipcMain.on(IPC.windowMinimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.on(IPC.windowMaximizeToggle, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on(IPC.windowFullscreenToggle, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setFullScreen(!win.isFullScreen());
  });
  ipcMain.on(IPC.windowClose, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  // ── File Dialogs (from original) ──
  ipcMain.handle(IPC.dialogOpenFile, async (event, opts: any) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const filters = opts?.filters?.length
      ? opts.filters
      : [{ name: "All Files", extensions: ["*"] }];
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ["openFile"], filters })
      : await dialog.showOpenDialog({ properties: ["openFile"], filters });
    if (result.canceled || !result.filePaths[0]) return null;
    return { name: path.basename(result.filePaths[0]), path: result.filePaths[0] };
  });

  // ── Local First: Research Folder ──
  ipcMain.handle(IPC.selectResearchFolder, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ["openDirectory"] })
      : await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(IPC.listLocalFiles, async (_evt, folderPath: string) => {
    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      return entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(folderPath, e.name),
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC.writeLocalFile, async (_evt, filePath: string, content: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
    return { ok: true };
  });

  ipcMain.handle(IPC.readLocalFile, async (_evt, filePath: string) => {
    try {
      return await fs.readFile(filePath, "utf8");
    } catch {
      return null;
    }
  });

  // ── PDF (from original) ──
  ipcMain.handle(IPC.readFileBase64, async (_evt, filePath: string) => {
    if (!filePath?.trim()) return null;
    try {
      const buf = await fs.readFile(path.resolve(filePath));
      return buf.toString("base64");
    } catch {
      return null;
    }
  });
}
