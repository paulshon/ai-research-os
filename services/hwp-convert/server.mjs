#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════
 *  hwp-convert — HWP/HWPX → PDF 변환 마이크로서비스 (v11)
 * ----------------------------------------------------------------
 *  데스크탑(Electron) 또는 자체 호스팅 환경에서 LibreOffice headless를
 *  통해 한컴 문서를 PDF로 변환하는 독립 HTTP 서비스.
 *
 *  웹앱(apps/web)의 /api/convert/hwp 라우트와 동일한 변환 로직을 제공하며,
 *  서버리스(예: Vercel)처럼 LibreOffice를 둘 수 없는 환경에서 별도 실행해
 *  HWP_CONVERT_URL 로 연결할 수 있다.
 *
 *  사용:
 *    LIBREOFFICE_BIN=/path/to/soffice node server.mjs      # 포트 7330
 *    POST /convert  (multipart: file=<.hwp|.hwpx>)  → application/pdf
 *    GET  /health                                   → { ok, bin }
 *
 *  LibreOffice 바이너리 탐색 우선순위:
 *    1) 환경변수 LIBREOFFICE_BIN
 *    2) 동봉 런타임 ./vendor/libreoffice/program/soffice(.exe)
 *    3) 시스템 PATH (soffice / libreoffice)
 * ════════════════════════════════════════════════════════════════
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.HWP_CONVERT_PORT || 7330;

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function resolveBin() {
  const env = process.env.LIBREOFFICE_BIN;
  if (env && (await exists(env))) return env;
  const isWin = process.platform === "win32";
  const exe = isWin ? "soffice.exe" : "soffice";
  const vendored = path.join(__dirname, "vendor", "libreoffice", "program", exe);
  if (await exists(vendored)) return vendored;
  return isWin ? null : "soffice";
}

function convert(bin, input, outDir) {
  return new Promise((resolve) => {
    const args = [
      "--headless", "--norestore",
      "--convert-to", "pdf:writer_pdf_Export",
      "--outdir", outDir, input,
    ];
    let stderr = "";
    let proc;
    try { proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] }); }
    catch (e) { return resolve({ ok: false, stderr: String(e?.message || e) }); }
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (e) => resolve({ ok: false, stderr: String(e?.message || e) }));
    proc.on("close", (code) => resolve({ ok: code === 0, stderr }));
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** 아주 단순한 multipart/form-data 파서(단일 파일 필드용) */
function parseMultipart(buf, contentType) {
  const m = /boundary=(.+)$/.exec(contentType || "");
  if (!m) return null;
  const boundary = Buffer.from(`--${m[1]}`);
  let start = buf.indexOf(boundary);
  if (start < 0) return null;
  start += boundary.length;
  const headerEnd = buf.indexOf("\r\n\r\n", start);
  if (headerEnd < 0) return null;
  const header = buf.slice(start, headerEnd).toString();
  const nameMatch = /filename="([^"]*)"/.exec(header);
  const filename = nameMatch ? nameMatch[1] : "document.hwp";
  const dataStart = headerEnd + 4;
  const next = buf.indexOf(boundary, dataStart);
  const dataEnd = next > -1 ? next - 2 : buf.length;
  return { filename, data: buf.slice(dataStart, dataEnd) };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    const bin = await resolveBin();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: !!bin, bin: bin || null }));
    return;
  }
  if (req.method === "POST" && req.url === "/convert") {
    const bin = await resolveBin();
    if (!bin) {
      res.writeHead(501, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, reason: "converter_unavailable" }));
      return;
    }
    try {
      const body = await readBody(req);
      const part = parseMultipart(body, req.headers["content-type"]);
      if (!part) { res.writeHead(400); res.end("bad multipart"); return; }
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-"));
      const safe = part.filename.replace(/[^\w.\-가-힣]+/g, "_") || "document.hwp";
      const input = path.join(tmp, safe);
      await fs.writeFile(input, part.data);
      const { ok, stderr } = await convert(bin, input, tmp);
      if (!ok) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, reason: "convert_failed", message: stderr.slice(0, 400) }));
        await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
        return;
      }
      const list = await fs.readdir(tmp);
      const pdf = list.find((f) => f.toLowerCase().endsWith(".pdf"));
      if (!pdf) { res.writeHead(502); res.end("no output"); await fs.rm(tmp, { recursive: true, force: true }).catch(()=>{}); return; }
      const bytes = await fs.readFile(path.join(tmp, pdf));
      res.writeHead(200, { "Content-Type": "application/pdf" });
      res.end(bytes);
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: String(e?.message || e) }));
    }
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

resolveBin().then((bin) => {
  server.listen(PORT, () => {
    console.log(`[hwp-convert] listening on :${PORT}`);
    console.log(`[hwp-convert] LibreOffice: ${bin || "NOT FOUND (set LIBREOFFICE_BIN or drop vendor/libreoffice)"}`);
  });
});
