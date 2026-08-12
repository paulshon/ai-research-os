/* ══════════════════════════════════════════════════════════════════════
   ove-4 · 논문 크리틱 PDF — IndexedDB 보관
   localStorage 용량 한도로 pdfBase64 가 빠지더라도 프로젝트 저장(.aros) 때
   원본 PDF 를 다시 붙여 넣기 위해 이 기기에 따로 보관한다.
   ══════════════════════════════════════════════════════════════════════ */

const DB_NAME = "aros-critique-pdf";
const STORE = "pdfs";
const KEY = "current";

/** 동기 스냅샷용 메모리 캐시 — IDB 와 함께 유지 */
let memCache: string | null = null;

export function getCritiquePdfMemory(): string | null {
  return memCache;
}

export function setCritiquePdfMemory(base64: string | null): void {
  memCache = base64;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no-idb"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb-open-failed"));
  });
}

export async function saveCritiquePdfBase64(base64: string | null): Promise<void> {
  memCache = base64;
  if (!base64) {
    await clearCritiquePdfStore();
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(base64, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb-put-failed"));
    });
    db.close();
  } catch (e) {
    console.warn("[aros] critique PDF IDB save failed:", e);
  }
}

export async function loadCritiquePdfBase64(): Promise<string | null> {
  try {
    const db = await openDb();
    const value = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
      req.onerror = () => reject(req.error ?? new Error("idb-get-failed"));
    });
    db.close();
    if (value) memCache = value;
    return value;
  } catch {
    return memCache;
  }
}

export async function clearCritiquePdfStore(): Promise<void> {
  memCache = null;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb-del-failed"));
    });
    db.close();
  } catch {
    /* noop */
  }
}
