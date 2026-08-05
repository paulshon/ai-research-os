/**
 * UODE — Conversion/Library Loader Layer
 *
 * 브라우저 환경에서 포맷별 파서 라이브러리를 CDN으로 지연 로드한다.
 * (기존 citation 시스템의 pdf.js 로딩 패턴을 일반화)
 *
 * 라이브러리 매핑 (첨부 코딩 체계 기준 → 브라우저 대응):
 *   PDF        → pdf.js          (PyMuPDF 대응)
 *   DOCX       → mammoth.js      (python-docx 대응)
 *   XLSX/XLS   → SheetJS(xlsx)   (openpyxl 대응)
 *   PPTX/HWPX  → JSZip + XML     (python-pptx / lxml 대응)
 */

type WindowWithLibs = Window &
  typeof globalThis & {
    pdfjsLib?: any;
    mammoth?: any;
    XLSX?: any;
    JSZip?: any;
    pako?: any;
  };

const CDN = {
  pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  pdfjsWorker:
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  mammoth:
    "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
  xlsx: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  pako: "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js",
};

const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();

/** 단일 스크립트를 1회만 로드 */
function loadScript(url: string): Promise<void> {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("UODE loaders require a browser environment"));
  }
  if (loaded.has(url)) return Promise.resolve();
  if (pending.has(url)) return pending.get(url)!;

  const p = new Promise<void>((resolve, reject) => {
    // 이미 페이지에 삽입된 동일 스크립트 재사용
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${url}"]`
    );
    if (existing && existing.dataset.loaded === "true") {
      loaded.add(url);
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = "true";
      loaded.add(url);
      resolve();
    };
    s.onerror = () => reject(new Error(`스크립트 로드 실패: ${url}`));
    document.head.appendChild(s);
  });

  pending.set(url, p);
  return p;
}

/** pdf.js 보장 로드 */
export async function ensurePdfJs(): Promise<any> {
  const w = window as WindowWithLibs;
  if (!w.pdfjsLib) await loadScript(CDN.pdfjs);
  if (w.pdfjsLib?.GlobalWorkerOptions) {
    w.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfjsWorker;
  }
  return w.pdfjsLib;
}

/** mammoth 보장 로드 (DOCX) */
export async function ensureMammoth(): Promise<any> {
  const w = window as WindowWithLibs;
  if (!w.mammoth) await loadScript(CDN.mammoth);
  return w.mammoth;
}

/** SheetJS 보장 로드 (XLSX/XLS) */
export async function ensureXLSX(): Promise<any> {
  const w = window as WindowWithLibs;
  if (!w.XLSX) await loadScript(CDN.xlsx);
  return w.XLSX;
}

/** JSZip 보장 로드 (PPTX/HWPX) */
export async function ensureJSZip(): Promise<any> {
  const w = window as WindowWithLibs;
  if (!w.JSZip) await loadScript(CDN.jszip);
  return w.JSZip;
}

/** pako(zlib) 보장 로드 (HWP 5.x 본문 스트림 압축 해제) */
export async function ensurePako(): Promise<any> {
  const w = window as WindowWithLibs;
  if (!w.pako) await loadScript(CDN.pako);
  return w.pako;
}

/** CFB(OLE2 Compound File) 보장 로드 — SheetJS 전체 빌드가 XLSX.CFB로 노출.
    HWP 5.x(OLE2 컨테이너) 파싱에 사용. 별도 의존성 없이 기존 XLSX 로더 재사용. */
export async function ensureCFB(): Promise<any> {
  const w = window as WindowWithLibs;
  if (!w.XLSX) await loadScript(CDN.xlsx);
  return w.XLSX?.CFB ?? null;
}
