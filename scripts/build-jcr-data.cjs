// JCR 엑셀(2026-newJCRimpactfactor.xlsx, Journals 시트) → apps/web/lib/literature/jcr-2026.json
// 사용:  node scripts/build-jcr-data.cjs <엑셀 경로>      (xlsx 패키지가 필요: 임시로 `npm i --no-save xlsx`)
// 레코드: [저널명, ISSN, eISSN, JIF(숫자|null; "<0.1" 은 0.05), JIF 사분위("Q1".."Q4"|""), 5년 JIF, 에디션 비트(SCIE=1,SSCI=2,AHCI=4,ESCI=8), 대표 분야]
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const src = process.argv[2];
if (!src) { console.error("엑셀 경로를 인자로 주세요."); process.exit(1); }
const wb = XLSX.readFile(src);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Journals"], { defval: "" });

const num = (v) => {
  const s = String(v ?? "").trim();
  if (!s || /^n\/?a$/i.test(s)) return null;
  if (s === "<0.1") return 0.05;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const issn = (v) => { const s = String(v ?? "").trim(); return /^\d{4}-\d{3}[\dXx]$/.test(s) ? s.toUpperCase() : ""; };
const editions = (v) => {
  const s = String(v ?? "").toUpperCase();
  return (/SCIE/.test(s) ? 1 : 0) | (/SSCI/.test(s) ? 2 : 0) | (/AHCI/.test(s) ? 4 : 0) | (/ESCI/.test(s) ? 8 : 0);
};

const data = rows
  .filter((r) => String(r["Journal name"]).trim())
  .map((r) => {
    const q = String(r["JIF quartile"]).trim();
    let cat = String(r["Categories"]).split(";")[0].trim();
    if (!cat || /^multiple$/i.test(cat)) {
      try { cat = String(JSON.parse(r["Category quartiles JSON"])[0].category || "").trim(); } catch { cat = ""; }
    }
    cat = cat.slice(0, 48);
    return [String(r["Journal name"]).trim(), issn(r["ISSN"]), issn(r["eISSN"]), num(r["2025 JIF"]), /^Q[1-4]$/.test(q) ? q : "", num(r["5-year JIF"]), editions(r["Editions"]), cat];
  });

const out = { version: "Clarivate JCR 2025 (2026 release)", count: data.length, fields: ["name", "issn", "eissn", "jif", "q", "jif5", "ed", "cat"], data };
const dest = path.join(__dirname, "..", "apps", "web", "lib", "literature", "jcr-2026.json");
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`${data.length} journals -> ${dest} (${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)} MB)`);
