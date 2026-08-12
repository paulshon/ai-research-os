/**
 * ove-6 정적 검증 — 캡션 전용 대화창 · 더블클릭 음성모드 · 답변 후 3/5초·10초
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
    "timing constants",
    join(web, "components/assistant/research-assistant.tsx"),
    ["PAUSE_SHORT_MS = 3_000", "PAUSE_LONG_MS = 5_000", "VOICE_IDLE_MS = 10_000", "SHORT_ANSWER_CHARS"],
  ],
  [
    "caption-only open + dbltap voice",
    join(web, "components/assistant/research-assistant.tsx"),
    ["openChatOnly", "enterVoiceMode", "DBL_TAP_MS", "orb.voiceModeHint"],
  ],
  [
    "post-answer standby",
    join(web, "components/assistant/research-assistant.tsx"),
    ["scheduleReturnToOrbStandby", "suppressRestartRef", "fromVoiceRef"],
  ],
  [
    "no auto-open on listen alone",
    join(web, "components/assistant/research-assistant.tsx"),
    ["음성모드에서 말하기 시작하면", "exitVoiceMode"],
  ],
  [
    "dock caption css",
    join(web, "components/assistant/orb-window-css.ts"),
    ["ra-root.ra-dock .ra-cap"],
  ],
  [
    "i18n voiceModeHint",
    join(web, "lib/i18n/locales/ko-ove.ts"),
    ["더블클릭하면 음성 인식 모드", "클릭하면 대화창으로 이동"],
  ],
];

console.log("=== ove-6 verification ===\n");
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

/* orb single-click must not call setOpen(true) directly on ra-orb */
{
  const path = join(web, "components/assistant/research-assistant.tsx");
  const txt = readFileSync(path, "utf8");
  const orbBtn = txt.match(/className="ra-orb"[\s\S]{0,800}?<\/button>/);
  if (!orbBtn) bad("orb button block missing");
  else if (/setOpen\(true\)/.test(orbBtn[0])) bad("orb button still opens chat on click");
  else ok("orb click does not open chat");
}

console.log(`\n=== ${failed === 0 ? "ALL PASSED" : failed + " FAILED"} ===`);
process.exit(failed === 0 ? 0 : 1);
