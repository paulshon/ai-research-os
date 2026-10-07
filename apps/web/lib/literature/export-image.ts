/* SVG 차트를 PNG·JPEG·SVG 로 내려받는다(브라우저 전용). 배경을 칠하고 제목 띠를 붙인다. */

export type ImgFormat = "png" | "jpeg" | "svg";

export async function exportSvgElement(svg: SVGSVGElement, format: ImgFormat, filename: string, opts: { bg?: string; title?: string; scale?: number; fg?: string } = {}) {
  const bg = opts.bg ?? "#13161e", fg = opts.fg ?? "#ffffff", scale = opts.scale ?? 2, vb = svg.viewBox?.baseVal;
  const rect = svg.getBoundingClientRect();
  const w = vb && vb.width ? vb.width : rect.width || 800, h = vb && vb.height ? vb.height : rect.height || 500;
  const head = opts.title ? 34 : 0;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("viewBox", `${vb?.x ?? 0} ${vb?.y ?? 0} ${w} ${h}`);
  clone.setAttribute("width", String(w)); clone.setAttribute("height", String(h));
  clone.setAttribute("font-family", "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif");
  clone.removeAttribute("class"); clone.removeAttribute("style");
  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bgRect.setAttribute("x", String((vb?.x ?? 0) - 5000)); bgRect.setAttribute("y", String((vb?.y ?? 0) - 5000)); bgRect.setAttribute("width", "20000"); bgRect.setAttribute("height", "20000"); bgRect.setAttribute("fill", bg);
  clone.insertBefore(bgRect, clone.firstChild);
  const xml = new XMLSerializer().serializeToString(clone);
  const save = (href: string) => { const a = document.createElement("a"); a.href = href; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); };
  if (format === "svg") { const u = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" })); save(u); setTimeout(() => URL.revokeObjectURL(u), 3000); return; }
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("이미지 변환 실패")); i.src = url; });
    const c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round((h + head) * scale);
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
    if (opts.title) { ctx.fillStyle = fg; ctx.font = `600 ${15 * scale}px 'Malgun Gothic','Noto Sans KR',sans-serif`; ctx.fillText(opts.title, 14 * scale, 23 * scale); }
    ctx.drawImage(img, 0, head * scale, w * scale, h * scale);
    await new Promise<void>((res) => c.toBlob((b) => { if (b) { const u = URL.createObjectURL(b); save(u); setTimeout(() => URL.revokeObjectURL(u), 3000); } res(); }, format === "jpeg" ? "image/jpeg" : "image/png", 0.94));
  } finally { URL.revokeObjectURL(url); }
}
