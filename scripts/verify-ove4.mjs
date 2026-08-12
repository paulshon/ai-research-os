/**
 * ove-4 정적 검증 — 웨이크워드 · 메뉴 인텐트 · 대화창 크기 · PDF IDB
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
  ["wake word", join(web, "lib/voice/speech.ts"), ["WakeWordWatcher", "matchesWakeWord", "오브"]],
  ["voice hook", join(web, "hooks/use-voice-input.ts"), ["startWake", "stopWake", "wakeArmed"]],
  ["orb canvas pulse", join(web, "components/assistant/orb-canvas.ts"), ["levelRef", "boundR", "smoothLvl"]],
  ["assistant", join(web, "components/assistant/research-assistant.tsx"), ["h: 340", "orb.openChat", "startWake", "ui.orbWindow.v4"]],
  ["menu intent", join(web, "components/dashboard/sidebar-items.ts"), ["연구설계메뉴", "문헌연구메뉴", "menuIntent", "stripMenuSuffix"]],
  ["i18n ko", join(web, "lib/i18n/locales/ko-ove.ts"), ["클릭하면 대화창으로 이동"]],
  ["pdf idb", join(web, "lib/critique-pdf-store.ts"), ["saveCritiquePdfBase64", "getCritiquePdfMemory"]],
  ["project save pdf", join(web, "lib/project-save.ts"), ["getCritiquePdfMemory", "pdfBase64"]],
  ["critique perf", join(web, "app/(dashboard)/critique/page.tsx"), ["thumbWindow", "requestIdleCallback", "saveCritiquePdfBase64"]],
  ["save buttons", join(web, "components/save/project-save-panel.tsx"), ["flex-[1.35]", "border-white/45"]],
];

console.log("=== ove-4 verification ===\n");
for (const [label, path, needles] of checks) {
  if (!existsSync(path)) {
    bad(`${label}: missing`);
    continue;
  }
  const txt = readFileSync(path, "utf8");
  const missing = needles.filter((n) => !txt.includes(n));
  if (missing.length) bad(`${label}: missing ${missing.join(", ")}`);
  else ok(label);
}

console.log(`\n=== ${failed === 0 ? "ALL PASSED" : failed + " FAILED"} ===`);
process.exit(failed === 0 ? 0 : 1);
