/**
 * UODE — Unified Office Document Engine
 * AI Research OS v19 · public API barrel
 *
 * 사용 예:
 *   import { processDocument, isSupportedFile, UODE_ACCEPT } from "@/lib/uode";
 *   const doc = await processDocument(file, { onProgress });
 *   editor.setText(doc.text);            // 추출 텍스트
 *   editor.setText(toFormattedText(doc)); // 원문 형식 보존 렌더
 */

export * from "./types";
export { detectFormat, detectFormatByName, formatLabel, categoryOf } from "./detect";
export {
  processDocument,
  toFormattedText,
  isSupportedFile,
  UODE_ACCEPT,
} from "./engine";
