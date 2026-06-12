import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/* ════════════════════════════════════════════════════════════════
   HWP/HWPX → PDF 변환 라우트 (v11)
   ----------------------------------------------------------------
   한컴 문서를 PDF로 변환한다. 변환 엔진은 LibreOffice headless를 사용한다
   (services/hwp-convert + mcp-libreoffice-runtime 동봉).

   LibreOffice 바이너리 탐색 우선순위:
     1) 환경변수 LIBREOFFICE_BIN
     2) 동봉 런타임:  services/hwp-convert/vendor/libreoffice/program/soffice(.exe)
     3) 시스템 PATH:  soffice / libreoffice

   바이너리를 찾지 못하면 501을 반환한다 → 클라이언트는 브라우저 내장
   HWP 파서(UODE)로 자동 폴백한다(항상 동작하는 경로).
   ⚠️ Vercel 등 서버리스에는 LibreOffice가 없으므로 501이 정상이며,
      데스크탑(Electron)·자체 호스팅 서버에서 변환이 활성화된다.
═══════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VENDOR_REL = [
  "services",
  "hwp-convert",
  "vendor",
  "libreoffice",
  "program",
];

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveSofficeBin(): Promise<string | null> {
  // 1) 명시 환경변수
  const env = process.env.LIBREOFFICE_BIN;
  if (env && (await exists(env))) return env;

  // 2) 동봉 런타임(레포 루트 기준 추정 경로 후보들)
  const isWin = process.platform === "win32";
  const exe = isWin ? "soffice.exe" : "soffice";
  const roots = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "..", ".."),
    path.resolve(process.cwd(), "..", "..", ".."),
  ];
  for (const root of roots) {
    const cand = path.join(root, ...VENDOR_REL, exe);
    if (await exists(cand)) return cand;
  }

  // 3) 시스템 PATH (존재 여부는 spawn 시 검증)
  return isWin ? null : "soffice";
}

function runConvert(
  bin: string,
  inputPath: string,
  outDir: string
): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    const args = [
      "--headless",
      "--norestore",
      "--convert-to",
      "pdf:writer_pdf_Export",
      "--outdir",
      outDir,
      inputPath,
    ];
    let stderr = "";
    let proc;
    try {
      proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    } catch (e: any) {
      resolve({ ok: false, stderr: String(e?.message || e) });
      return;
    }
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (e) =>
      resolve({ ok: false, stderr: String(e?.message || e) })
    );
    proc.on("close", (code) => resolve({ ok: code === 0, stderr }));
  });
}

export async function POST(req: Request) {
  const bin = await resolveSofficeBin();
  if (!bin) {
    return NextResponse.json(
      {
        ok: false,
        reason: "converter_unavailable",
        message:
          "LibreOffice 변환기를 찾을 수 없습니다. 브라우저 내장 HWP 파서로 폴백합니다.",
      },
      { status: 501 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "bad_request" },
      { status: 400 }
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, reason: "no_file" },
      { status: 400 }
    );
  }
  const name = file.name || "document.hwp";
  if (!/\.(hwp|hwpx)$/i.test(name)) {
    return NextResponse.json(
      { ok: false, reason: "unsupported_type" },
      { status: 415 }
    );
  }

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-"));
  const safeBase = name.replace(/[^\w.\-가-힣]+/g, "_");
  const inputPath = path.join(tmpRoot, safeBase);
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputPath, buf);

    const { ok, stderr } = await runConvert(bin, inputPath, tmpRoot);
    if (!ok) {
      return NextResponse.json(
        { ok: false, reason: "convert_failed", message: stderr.slice(0, 500) },
        { status: 502 }
      );
    }

    const pdfName = safeBase.replace(/\.(hwp|hwpx)$/i, ".pdf");
    const pdfPath = path.join(tmpRoot, pdfName);
    if (!(await exists(pdfPath))) {
      // outdir 내 첫 .pdf 검색(파일명 정규화 차이 대비)
      const list = await fs.readdir(tmpRoot);
      const found = list.find((f) => f.toLowerCase().endsWith(".pdf"));
      if (!found) {
        return NextResponse.json(
          { ok: false, reason: "no_output" },
          { status: 502 }
        );
      }
      const pdf = await fs.readFile(path.join(tmpRoot, found));
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${pdfName}"`,
        },
      });
    }
    const pdf = await fs.readFile(pdfPath);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfName}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: "exception", message: String(e?.message || e) },
      { status: 500 }
    );
  } finally {
    fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
  }
}
