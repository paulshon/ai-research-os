"use client";

/**
 * ════════════════════════════════════════════════════════════════
 *  HWP 변환 클라이언트 헬퍼 (v11)
 * ----------------------------------------------------------------
 *  HWP/HWPX 업로드 시, 서버 변환기(/api/convert/hwp, LibreOffice)로
 *  PDF 변환을 시도한다. 변환기가 없거나 실패하면 null을 반환하여,
 *  호출 측이 브라우저 내장 HWP 파서(UODE)로 폴백하도록 한다.
 * ════════════════════════════════════════════════════════════════
 */

export function isHwpFile(file: File): boolean {
  return /\.(hwp|hwpx)$/i.test(file.name);
}

export interface HwpConvertResult {
  /** 변환 성공 시 PDF File, 미지원/실패 시 null */
  pdf: File | null;
  /** 사용자 안내용 사유 코드 */
  reason: "ok" | "unavailable" | "failed";
  message?: string;
}

export async function convertHwpToPdf(
  file: File,
  onStage?: (msg: string) => void
): Promise<HwpConvertResult> {
  if (!isHwpFile(file)) return { pdf: null, reason: "unavailable" };
  try {
    onStage?.("한컴 문서를 PDF로 변환 중…");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/convert/hwp", { method: "POST", body: fd });

    // 501: 변환기 미설치 → 폴백
    if (res.status === 501) {
      return { pdf: null, reason: "unavailable" };
    }
    if (!res.ok) {
      let message = `변환 실패(${res.status})`;
      try {
        const j = await res.json();
        message = j?.message || j?.reason || message;
      } catch {
        /* ignore */
      }
      return { pdf: null, reason: "failed", message };
    }
    const blob = await res.blob();
    if (!blob || blob.size < 100) {
      return { pdf: null, reason: "failed", message: "빈 변환 결과" };
    }
    const pdfName = file.name.replace(/\.(hwp|hwpx)$/i, ".pdf");
    const pdf = new File([blob], pdfName, { type: "application/pdf" });
    return { pdf, reason: "ok" };
  } catch (e: any) {
    return { pdf: null, reason: "failed", message: String(e?.message || e) };
  }
}
