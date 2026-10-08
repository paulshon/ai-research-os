/* 글자 폭 측정과 줄바꿈 — 차트 라벨이 잘리거나 겹치지 않도록 실제 폭을 재서 자리를 잡는다(브라우저에서는 canvas, 서버·시험에서는 어림값) */

let ctx: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();
const FONT = "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif";

export function textWidth(s: string, px = 11, weight = 400): number {
  const key = `${weight}|${px}|${s}`, hit = cache.get(key); if (hit != null) return hit;
  if (ctx === undefined) { try { ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null; } catch { ctx = null; } }
  let w = 0;
  if (ctx) { ctx.font = `${weight} ${px}px ${FONT}`; w = ctx.measureText(s).width * 1.04; }
  else for (const ch of s) w += ch.charCodeAt(0) > 0x2e80 ? px : px * 0.58;
  if (cache.size > 6000) cache.clear();
  cache.set(key, w); return w;
}

/** 공백 기준으로 줄을 나누고, 한 낱말이 폭을 넘으면 글자 단위로 쪼갠다. maxLines 를 넘을 때만 마지막 줄 끝을 …로 줄인다. */
export function wrapText(s: string, maxW: number, px = 11, maxLines = 3): string[] {
  const text = String(s ?? "").replace(/\s+/g, " ").trim(); if (!text) return [""];
  if (textWidth(text, px) <= maxW) return [text];
  const words = text.split(" "), lines: string[] = []; let cur = "";
  const push = (w: string) => {
    if (textWidth(w, px) <= maxW) { cur = w; return; }
    let part = ""; for (const ch of w) { if (textWidth(part + ch, px) > maxW && part) { lines.push(part); part = ch; } else part += ch; } cur = part;
  };
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textWidth(t, px) <= maxW) cur = t; else { if (cur) lines.push(cur); push(w); }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines); let last = keep[maxLines - 1] + "…";
    while (textWidth(last, px) > maxW && last.length > 2) last = last.slice(0, -2) + "…";
    keep[maxLines - 1] = last; return keep;
  }
  return lines;
}

/** 여러 라벨 중 가장 넓은 폭(상한 cap) */
export function maxTextWidth(labels: string[], px = 11, cap = 260): number {
  return Math.min(cap, Math.ceil(Math.max(0, ...labels.map((l) => textWidth(l, px)))));
}

/** 세로로 겹치는 라벨을 밀어 펴 준다. ys: 원하는 중심 y, hs: 각 라벨 높이. 반환: 겹치지 않는 중심 y(원래 순서). */
export function spread(ys: number[], hs: number[], lo: number, hi: number, gap = 2): number[] {
  const idx = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]), out = ys.slice();
  let prev = lo;
  for (const i of idx) { const top = Math.max(ys[i] - hs[i] / 2, prev); out[i] = top + hs[i] / 2; prev = top + hs[i] + gap; }
  const last = idx[idx.length - 1];
  if (last != null && out[last] + hs[last] / 2 > hi) {                       // 아래로 넘치면 위로 되밀기
    let limit = hi;
    for (let k = idx.length - 1; k >= 0; k--) { const i = idx[k], bottom = Math.min(out[i] + hs[i] / 2, limit); out[i] = bottom - hs[i] / 2; limit = bottom - hs[i] - gap; }
  }
  return out;
}
