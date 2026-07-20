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
import { fork, type ChildProcess } from "node:child_process";
import net from "node:net";
import http from "node:http";
import fs from "node:fs";
import { registerIpcHandlers } from "./ipc";
import { initLocalFileSystem } from "../filesystem/local-fs";
import { initSyncEngine } from "../sync/sync-engine";

let mainWindow: BrowserWindow | null = null;
let webServer: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === "development";
const DEV_WEB_URL = process.env.WEB_URL || "http://localhost:3000";

/** 사용 가능한 로컬 포트를 찾는다(기본 17321부터 증가하며 시도). */
function findFreePort(start = 17321): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", () => {
      if (start > 17420) return reject(new Error("no free port found"));
      resolve(findFreePort(start + 1));
    });
    srv.listen(start, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

/** 지정 포트에 HTTP 응답이 올 때까지 폴링한다(Next standalone 서버 기동 대기). */
function waitForServer(port: number, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 1500 }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) return reject(new Error("web server startup timed out"));
        setTimeout(tryOnce, 300);
      });
      req.on("timeout", () => req.destroy());
    };
    tryOnce();
  });
}

/**
 * 패키징된 프로덕션 앱에서 Next.js standalone 서버(server.js)를 Electron 내장 Node로 구동한다.
 * 모노레포 트레이싱 때문에 standalone 출력은 저장소 루트 기준 상대 경로를 그대로 미러링한다
 * (예: apps/web/.next/standalone/apps/web/server.js) — electron-builder extraResources가
 * resources/web-standalone 아래에 그 구조를 통째로 복사해 둔다(apps/desktop/package.json 참고).
 */
async function startBundledWebServer(): Promise<string> {
  const standaloneRoot = path.join(process.resourcesPath, "web-standalone");
  const serverEntry = path.join(standaloneRoot, "apps", "web", "server.js");
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`bundled web server not found at ${serverEntry}`);
  }
  const port = await findFreePort();
  webServer = fork(serverEntry, [], {
    cwd: path.dirname(serverEntry),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "pipe",
  });
  webServer.stdout?.on("data", (d) => console.log("[web]", d.toString().trim()));
  webServer.stderr?.on("data", (d) => console.error("[web]", d.toString().trim()));
  await waitForServer(port);
  return `http://127.0.0.1:${port}`;
}

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

    // 개발 모드: `next dev`(localhost:3000)를 로드.
    // 프로덕션(패키징): 번들된 Next standalone 서버를 내장 Node로 직접 구동해 오프라인으로 로드.
    try {
      const targetUrl = isDev ? DEV_WEB_URL : await startBundledWebServer();
      await mainWindow.loadURL(targetUrl);
    } catch (err) {
      console.error("[main] failed to start/load web app:", err);
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

  app.on("before-quit", () => {
    if (webServer && !webServer.killed) {
      webServer.kill();
      webServer = null;
    }
  });
}
