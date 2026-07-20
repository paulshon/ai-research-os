/**
 * 차트·표 내보내기 — JPEG / PNG / PDF / 엑셀
 * SVG(CaChart) → Canvas → 이미지, PDF는 임베드 이미지 + 텍스트 페이지
 */
import * as XLSX from "xlsx";

export function downloadBlob(filename: string, data: BlobPart | Uint8Array, mime: string) {
  const part: BlobPart = data instanceof Uint8Array ? (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer) : data;
  const blob = data instanceof Blob ? data : new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** SVG 요소 또는 컨테이너 내 svg를 PNG/JPEG로 */
export async function exportSvgElement(
  el: Element | null | undefined,
  filename: string,
  format: "png" | "jpeg" = "png",
  scale = 2
): Promise<boolean> {
  if (!el || typeof document === "undefined") return false;
  const svg = el.tagName.toLowerCase() === "svg" ? (el as SVGSVGElement) : el.querySelector("svg");
  if (!svg) return false;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = clone.getAttribute("viewBox") || `0 0 ${clone.clientWidth || 560} ${clone.clientHeight || 320}`;
  const [, , vw, vh] = vb.split(/[\s,]+/).map(Number);
  const W = (vw || 560) * scale;
  const H = (vh || 320) * scale;
  clone.setAttribute("width", String(W));
  clone.setAttribute("height", String(H));
  // CSS 변수를 실제 색으로 치환(캔버스는 var() 미지원)
  const cs = getComputedStyle(document.documentElement);
  const replaceVars = (s: string) =>
    s.replace(/var\((--[\w-]+)\)/g, (_, name) => cs.getPropertyValue(name).trim() || "#333");
  let xml = new XMLSerializer().serializeToString(clone);
  xml = replaceVars(xml);
  if (!xml.includes("xmlns=")) {
    xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    if (format === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.drawImage(img, 0, 0, W, H);
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = canvas.toDataURL(mime, 0.92);
    const bin = dataUrlToUint8(dataUrl);
    downloadBlob(filename, bin, mime);
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function dataUrlToUint8(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(",")[1] || "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 간단 PDF (텍스트 + 선택적 PNG 이미지) — 외부 라이브러리 없이 */
export function exportSimplePdf(opts: {
  filename: string;
  title: string;
  lines: string[];
  imagePng?: Uint8Array | null;
}) {
  const textLines = [opts.title, "", ...opts.lines].map((l) => String(l).slice(0, 90));
  // Minimal PDF with Helvetica text (ASCII-safe fallback for Korean → use UTF-16 via hex for Latin)
  // For Korean: embed as PNG snapshot of a canvas-rendered page when possible.
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    const W = 794; // A4 ~96dpi
    const lineH = 18;
    const pad = 40;
    const H = Math.max(1123, pad * 2 + textLines.length * lineH + (opts.imagePng ? 360 : 0));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 18px Malgun Gothic, sans-serif";
    ctx.fillText(opts.title.slice(0, 60), pad, pad + 8);
    ctx.font = "13px Malgun Gothic, sans-serif";
    let y = pad + 36;
    textLines.slice(1).forEach((line) => {
      ctx.fillText(line, pad, y);
      y += lineH;
      if (y > H - 40) return;
    });
    const finish = () => {
      // Convert canvas → PDF via print window (reliable Korean) OR download as PDF-like image
      // Prefer true PDF: use canvas→jpeg pages wrapped in minimal PDF with DCT image
      const jpeg = canvas.toDataURL("image/jpeg", 0.92);
      const jpegBytes = dataUrlToUint8(jpeg);
      const pdf = buildJpegPdf(jpegBytes, W, H);
      downloadBlob(opts.filename, pdf, "application/pdf");
    };
    if (opts.imagePng) {
      const url = URL.createObjectURL(new Blob([opts.imagePng.buffer.slice(opts.imagePng.byteOffset, opts.imagePng.byteOffset + opts.imagePng.byteLength) as ArrayBuffer], { type: "image/png" }));
      const img = new Image();
      img.onload = () => {
        const iw = W - pad * 2;
        const ih = (img.height / img.width) * iw;
        ctx.drawImage(img, pad, y + 10, iw, Math.min(ih, 340));
        URL.revokeObjectURL(url);
        finish();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        finish();
      };
      img.src = url;
    } else {
      finish();
    }
    return;
  }
  // SSR fallback: empty
  downloadBlob(opts.filename, "%PDF-1.1\n%%EOF", "application/pdf");
}

function buildJpegPdf(jpeg: Uint8Array, w: number, h: number): Uint8Array {
  // Single-page PDF with one DCTDecode image
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const push = (s: string | Uint8Array) => {
    if (typeof s === "string") chunks.push(encoder.encode(s));
    else chunks.push(s);
  };
  const objects: { offset: number }[] = [{ offset: 0 }];
  let body = "";
  const addObj = (content: string | Uint8Array) => {
    objects.push({ offset: 0 }); // filled later
    return content;
  };
  // We'll assemble manually
  const parts: (string | Uint8Array)[] = [];
  const offsets: number[] = [0];
  let size = 0;
  const append = (p: string | Uint8Array) => {
    parts.push(p);
    size += typeof p === "string" ? encoder.encode(p).length : p.length;
  };
  const markObj = () => {
    offsets.push(size);
  };

  append("%PDF-1.4\n");
  markObj(); // 1 Catalog
  append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  markObj(); // 2 Pages
  append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  markObj(); // 3 Page
  append(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n`
  );
  const contentStream = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q\n`;
  markObj(); // 4 Contents
  append(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);
  markObj(); // 5 Image
  append(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  );
  append(jpeg);
  append("\nendstream\nendobj\n");
  const xrefPos = size;
  append(`xref\n0 ${offsets.length}\n`);
  append("0000000000 65535 f \n");
  for (let i = 1; i < offsets.length; i++) {
    append(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  }
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  // Flatten
  const total = parts.reduce((n, p) => n + (typeof p === "string" ? encoder.encode(p).length : p.length), 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    const b = typeof p === "string" ? encoder.encode(p) : p;
    out.set(b, o);
    o += b.length;
  }
  return out;
}

/** 표 + 메타 → 엑셀 */
export function exportTableXlsx(
  filename: string,
  sheets: { name: string; aoa: (string | number | null | undefined)[][] }[]
) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet(s.aoa.map((row) => row.map((c) => (c == null ? "" : c))));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31) || "Sheet");
  });
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  downloadBlob(filename, new Uint8Array(out), "application/octet-stream");
}

/** 컨테이너에서 SVG 찾아 멀티포맷 내보내기 헬퍼 */
export async function exportChartBundle(opts: {
  container: HTMLElement | null;
  baseName: string;
  title: string;
  summaryLines: string[];
  table?: { cols: string[]; rows: (string | number)[][] };
  format: "png" | "jpeg" | "pdf" | "xlsx";
}) {
  const { container, baseName, title, summaryLines, table, format } = opts;
  if (format === "xlsx") {
    const aoa: (string | number)[][] = [[title], [], ...summaryLines.map((l) => [l])];
    if (table) {
      aoa.push([]);
      aoa.push(table.cols);
      table.rows.forEach((r) => aoa.push(r));
    }
    exportTableXlsx(`${baseName}.xlsx`, [{ name: "results", aoa }]);
    return;
  }
  if (format === "png" || format === "jpeg") {
    const ok = await exportSvgElement(container, `${baseName}.${format}`, format);
    if (!ok) {
      // fallback: text-only canvas
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 800, 400);
      ctx.fillStyle = "#111";
      ctx.font = "16px sans-serif";
      ctx.fillText(title, 24, 40);
      summaryLines.slice(0, 12).forEach((l, i) => ctx.fillText(l.slice(0, 80), 24, 70 + i * 22));
      const mime = format === "jpeg" ? "image/jpeg" : "image/png";
      const bin = dataUrlToUint8(canvas.toDataURL(mime, 0.92));
      downloadBlob(`${baseName}.${format}`, bin, mime);
    }
    return;
  }
  // pdf
  let png: Uint8Array | null = null;
  if (container) {
    const svg = container.querySelector("svg");
    if (svg) {
      try {
        const clone = svg.cloneNode(true) as SVGSVGElement;
        const cs = getComputedStyle(document.documentElement);
        let xml = new XMLSerializer().serializeToString(clone);
        xml = xml.replace(/var\((--[\w-]+)\)/g, (_, name) => cs.getPropertyValue(name).trim() || "#333");
        if (!xml.includes("xmlns=")) xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = await loadImage(url);
        URL.revokeObjectURL(url);
        const c = document.createElement("canvas");
        c.width = 560 * 2;
        c.height = 320 * 2;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        png = dataUrlToUint8(c.toDataURL("image/png"));
      } catch {
        png = null;
      }
    }
  }
  exportSimplePdf({
    filename: `${baseName}.pdf`,
    title,
    lines: summaryLines,
    imagePng: png,
  });
}
