/**
 * 토큰·대비·금지 패턴 검사.
 * 사용: npx tsx scripts/verify-design.ts
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const WEB = path.join(ROOT, "apps", "web");

function walk(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "dist") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|css)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function relativeLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

const BG = "#04060e";
const checks: [string, string, number][] = [
  ["#eef1f8", "t1", 4.5],
  ["#aab4ca", "t2", 4.5],
  ["#7f8aa3", "t3", 4.5],
  ["#6d8dff", "accent", 4.5],
  ["#3ecfb2", "ok", 4.5],
  ["#e8b84b", "warn", 4.5],
  ["#ff7066", "danger", 4.5],
];

let failed = 0;
console.log("── WCAG contrast on --bg-0 ──");
for (const [hex, name, min] of checks) {
  const c = contrast(hex, BG);
  const ok = c >= min;
  console.log(`  ${ok ? "OK" : "FAIL"}  ${name} ${hex}  ${c.toFixed(2)}:1  (need ≥${min})`);
  if (!ok) failed++;
}

console.log("\n── Forbidden patterns in app/ + components/ ──");
const files = [
  ...walk(path.join(WEB, "app")),
  ...walk(path.join(WEB, "components")),
].filter((f) => !f.endsWith("globals.css"));

const hexRe = /#[0-9a-fA-F]{6}\b/g;
const arbFs = /text-\[\d+(\.\d+)?px\]/g;
const arbRd = /rounded-\[\d+px\]/g;
const wash = /text-white\/(20|25|30)\b/g;

let hexHits = 0;
let arbHits = 0;
let washHits = 0;
const allowHex = new Set([
  // design-tokens.ts 와 Clerk/문서 뷰어(흰 종이) 는 예외
  path.normalize(path.join(WEB, "lib", "design-tokens.ts")),
]);

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const rel = path.relative(WEB, f);
  // 문서 뷰어의 흰 종이(#f7f8fb 등)와 research-data color 배지는 허용하되 집계한다
  const isDocPaper = /doc-page|DocumentReproduction|marked-text/.test(rel);
  if (!allowHex.has(path.normalize(f)) && !isDocPaper) {
    const m = src.match(hexRe);
    if (m) {
      // chapter color from research-data inline style is OK if it's reading .color
      const suspicious = m.filter(() => true);
      if (suspicious.length && !/research-data|chapter\.color|type\.color|tbadge|tno/.test(src)) {
        // soft warn — many legacy marketing pages still have hex; count only new shell/ui
        if (/components[\\/](ui|shell|inspector|bench|structure|analyzer|proofread|critique|writing|rdos)/.test(rel)
          || /app[\\/]\(dashboard\)|app[\\/]\(rdos\)/.test(rel)) {
          hexHits += suspicious.length;
          console.log(`  HEX  ${rel}  ×${suspicious.length}`);
        }
      }
    }
  }
  if (arbFs.test(src)) { arbHits++; console.log(`  ARB-FS  ${rel}`); }
  if (arbRd.test(src)) { arbHits++; console.log(`  ARB-RD  ${rel}`); }
  if (wash.test(src)) { washHits++; console.log(`  WASH  ${rel}`); }
}

console.log(`\nhex hits (redesigned surfaces): ${hexHits}`);
console.log(`arbitrary size hits: ${arbHits}`);
console.log(`text-white/20-30 hits: ${washHits}`);

if (failed || washHits) {
  console.error("\nVERIFY FAILED");
  process.exit(1);
}
console.log("\nVERIFY OK");
