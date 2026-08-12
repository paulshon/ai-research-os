/**
 * Studium R — Electron Main Process
 * ========================================
 * Migrated from ai-research-studio (2).
 * Now connects to:
 *   - Vercel (web UI via BrowserWindow loading remote URL or local renderer)
 *   - Railway (FastAPI via HTTP for AI)
 *   - Supabase (Auth + DB sync)
 *   - Local filesystem (Local First storage)
 */

import { app, BrowserWindow, session, shell, systemPreferences } from "electron";
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

/* ══════════════════════════════════════════════════════════════════════
   ove-2 · 마이크 권한 (데스크탑에서 음성 인식이 안 되던 핵심 원인)

   Electron 은 권한 핸들러를 등록하지 않으면 렌더러의 getUserMedia 요청을
   확인할 방법이 없어 NotAllowedError 로 떨어진다. 브라우저처럼 "허용" 창이
   뜨지 않으므로 사용자는 원인을 알 수도 없다.
   여기서 media(오디오)만 명시적으로 허용하고 나머지는 거부한다.
   macOS 는 OS 차원의 마이크 접근을 앱 시작 시 한 번 요청한다.
   ══════════════════════════════════════════════════════════════════════ */
const ALLOWED_PERMISSIONS = new Set(["media", "audioCapture", "clipboard-read", "clipboard-sanitized-write"]);

async function setupMediaPermissions(): Promise<void> {
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
    if (permission === "media") {
      /* 오디오만 허용한다. 화면·카메라 캡처는 거부. */
      const types = (details as { mediaTypes?: string[] } | undefined)?.mediaTypes;
      const videoOnly = Array.isArray(types) && types.length > 0 && !types.includes("audio");
      return callback(!videoOnly);
    }
    callback(ALLOWED_PERMISSIONS.has(permission));
  });

  /* navigator.permissions.query 와 동기 권한 확인 경로 */
  ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));

  /* 사용자가 고른 입력 장치를 그대로 쓰게 한다 */
  ses.setDevicePermissionHandler(() => true);

  if (process.platform === "darwin") {
    try {
      const status = systemPreferences.getMediaAccessStatus("microphone");
      if (status !== "granted") await systemPreferences.askForMediaAccess("microphone");
    } catch (e) {
      console.error("[main] microphone access request failed:", e);
    }
  } else if (process.platform === "win32") {
    try {
      console.log("[main] microphone access status:", systemPreferences.getMediaAccessStatus("microphone"));
    } catch {
      /* 일부 윈도우 빌드에는 이 API 가 없다 */
    }
  }
}

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
    // ove-2: 렌더러가 마이크를 열기 전에 권한 핸들러를 먼저 건다.
    await setupMediaPermissions();

    // Register all IPC handlers (file access, PDF, settings, etc.)
    registerIpcHandlers();

    // Initialize local filesystem watcher
    await initLocalFileSystem();

    // Initialize cloud sync engine
    await initSyncEngine();

    // Create main window
    mainWindow = new BrowserWindow({
      // s-renew-13: 창 제목은 브랜드 로고타입 그대로 "StudiumR"
      title: "StudiumR",
      // s-renew-14: 창·작업표시줄 아이콘을 브랜드 R 로고로 고정한다.
      icon: path.join(__dirname, "../../build/icon.png"),
      width: 1440,
      height: 900,
      minWidth: 960,
      minHeight: 640,
      show: false,
      frame: false,
      backgroundColor: "#0E1626",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    mainWindow.once("ready-to-show", () => mainWindow?.show());

    // 문서 title 이 바뀌어도 창 제목은 브랜드 로고타입을 유지한다.
    mainWindow.on("page-title-updated", (e) => {
      e.preventDefault();
      mainWindow?.setTitle("StudiumR");
    });

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
