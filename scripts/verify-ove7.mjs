/**
 * ove-7 정적 검증 — 단일 클릭 음성 중지 · 모바일 오브·메뉴 한 화면
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps", "web");
let failed = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => {
  failed++;
  console.error(`  FAIL  ${m}`);
};

const checks = [
  [
    "single tap stop voice",
    join(web, "components/assistant/research-assistant.tsx"),
    ["stopOrbVoiceListening", "orbSingleTapTimerRef", "onDoubleClick", "voiceStopHint"],
  ],
  [
    "mobile orb clearance",
    join(web, "components/assistant/orb-window-css.ts"),
    ["ra-center.ra-slot", "top:calc(100% + 14px)", "ra-dock{bottom:calc"],
  ],
  [
    "standby mobile grid",
    join(web, "components/dashboard/menu-grid.tsx"),
    ["standbyMobile", "max-[767px]:min-h-[68px]"],
  ],
  [
    "dashboard one screen",
    join(web, "app/(dashboard)/dashboard/page.tsx"),
    ["standbyMobile", "imm-tabbar", "max-[767px]:mt-2"],
  ],
  [
    "i18n stop hint",
    join(web, "lib/i18n/locales/ko-ove.ts"),
    ["voiceStopHint", "한 번 클릭하면 음성 인식 중지"],
  ],
];

console.log("=== ove-7 verification ===\n");
for (const [label, path, needles] of checks) {
  if (!existsSync(path)) {
    bad(`${label}: missing file`);
    continue;
  }
  const txt = readFileSync(path, "utf8");
  const missing = needles.filter((n) => !txt.includes(n));
  if (missing.length) bad(`${label}: missing ${missing.join(", ")}`);
  else ok(label);
}

console.log(`\n=== ${failed === 0 ? "ALL PASSED" : failed + " FAILED"} ===`);
process.exit(failed === 0 ? 0 : 1);
