"use client";

/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 작업 히스토리 저장소 (로컬 우선)

   사이드바의 전체메뉴가 중앙으로 옮겨가면서 비워진 자리에,
   클로드·챗지피티처럼 "작업한 리스트의 제목 + 연·월·일·시각"이 쌓인다.
   저장은 전부 이 기기(IndexedDB)에서 이뤄지고, 서버로 나가지 않는다.
     · 세션 본문   IndexedDB  studiumr / sessions
     · UI 환경설정 localStorage (사이드바 폭, 창 위치 등)
   IndexedDB 를 못 쓰는 환경(사생활 보호 모드 등)에서는 localStorage 로
   자동 강등되어 기능이 멈추지 않는다.
   ══════════════════════════════════════════════════════════════════════ */

export interface WorkSession {
  id: string;
  title: string;
  /** 작업(메뉴) 코드 — RESEARCH_FLOW_ITEMS 의 href 와 같다 */
  taskId: string;
  href: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  /** 다음 패널이 자동 참조하는 산출물 */
  context?: Record<string, unknown>;
  /** 패널 스택(뒤로 가기용) */
  panelStack?: string[];
}

const DB_NAME = "studiumr";
const DB_VERSION = 1;
const STORE = "sessions";
const LS_KEY = "aros:work-sessions";
export const HISTORY_EVENT = "aros:history-changed";
const CHANNEL = "studiumr";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let settled = false;
    const finish = (v: IDBDatabase | null) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: "id" });
          os.createIndex("updatedAt", "updatedAt");
          os.createIndex("taskId", "taskId");
        }
      };
      req.onsuccess = () => finish(req.result);
      req.onerror = () => finish(null);
      req.onblocked = () => finish(null);
      setTimeout(() => finish(null), 3_000);
    } catch {
      finish(null);
    }
  });
  return dbPromise;
}

/* ── localStorage 폴백 ─────────────────────────────────────────────── */
function lsRead(): WorkSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) ?? "[]") as WorkSession[];
  } catch {
    return [];
  }
}
function lsWrite(rows: WorkSession[]) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(rows.slice(0, 400)));
  } catch {
    /* 용량 초과는 조용히 넘긴다 — 화면은 계속 동작해야 한다 */
  }
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
  try {
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel(CHANNEL);
      ch.postMessage({ type: "history" });
      ch.close();
    }
  } catch {
    /* noop */
  }
}

/* ── 공개 API ──────────────────────────────────────────────────────── */

export async function listSessions(): Promise<WorkSession[]> {
  const db = await openDb();
  if (!db) return lsRead().sort((a, b) => b.updatedAt - a.updatedAt);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () =>
        resolve(((req.result as WorkSession[]) ?? []).sort((a, b) => b.updatedAt - a.updatedAt));
      req.onerror = () => resolve(lsRead());
    } catch {
      resolve(lsRead());
    }
  });
}

export async function putSession(s: WorkSession): Promise<void> {
  const db = await openDb();
  if (!db) {
    const rows = lsRead().filter((r) => r.id !== s.id);
    rows.unshift(s);
    lsWrite(rows);
    notify();
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(s);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  notify();
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    lsWrite(lsRead().filter((r) => r.id !== id));
    notify();
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  notify();
}

export async function renameSession(id: string, title: string): Promise<void> {
  const rows = await listSessions();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  await putSession({ ...row, title: title.slice(0, 80), updatedAt: Date.now() });
}

/**
 * 메뉴/발화로 작업에 들어갈 때 호출한다.
 * 같은 작업을 5분 안에 다시 열면 새 항목을 만들지 않고 시각만 갱신한다.
 */
export async function touchSession(input: {
  href: string;
  taskId: string;
  title: string;
  context?: Record<string, unknown>;
}): Promise<WorkSession> {
  const now = Date.now();
  const rows = await listSessions();
  const recent = rows.find((r) => r.href === input.href && now - r.updatedAt < 5 * 60_000);
  const row: WorkSession = recent
    ? { ...recent, updatedAt: now, context: { ...recent.context, ...input.context } }
    : {
        id: `s_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        title: input.title.slice(0, 80),
        taskId: input.taskId,
        href: input.href,
        createdAt: now,
        updatedAt: now,
        context: input.context ?? {},
        panelStack: [],
      };
  await putSession(row);
  return row;
}

/* ── 표시용 도우미 ─────────────────────────────────────────────────── */

/** 2026-08-10 18:26 — 연·월·일과 시각을 항상 함께 보여준다 */
export function formatStamp(ts: number, locale = "ko"): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  const ymd = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  return locale === "ko" ? `${ymd} ${hm}` : `${ymd} ${hm}`;
}

export type HistoryGroupKey = "today" | "yesterday" | "week" | "month" | string;

export function groupOf(ts: number): HistoryGroupKey {
  const now = new Date();
  const d = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  if (ts >= startOfToday) return "today";
  if (ts >= startOfToday - day) return "yesterday";
  if (ts >= startOfToday - 7 * day) return "week";
  if (ts >= startOfToday - 30 * day) return "month";
  return String(d.getFullYear());
}

export function groupSessions(rows: WorkSession[]): { key: HistoryGroupKey; rows: WorkSession[] }[] {
  const order: HistoryGroupKey[] = ["today", "yesterday", "week", "month"];
  const map = new Map<HistoryGroupKey, WorkSession[]>();
  for (const r of rows) {
    const k = groupOf(r.updatedAt);
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  const years = [...map.keys()]
    .filter((k) => !order.includes(k))
    .sort((a, b) => Number(b) - Number(a));
  return [...order, ...years]
    .filter((k) => map.has(k))
    .map((k) => ({ key: k, rows: map.get(k)! }));
}
