/**
 * ove-3 · 음성/녹음장치 연동 검증
 * Windows 장치 목록은 별도 PowerShell로 확인한다.
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

console.log("=== ove-3 voice & orb verification ===\n");
console.log("[1] Source integrity (voice + CRT + orb sizes)");
const checks = [
  ["speech.ts", join(web, "lib/voice/speech.ts"), ["ensureDefaultMicrophone", "listMicrophones", "acquireMicStream"]],
  ["use-voice-input.ts", join(web, "hooks/use-voice-input.ts"), ["ensureDefaultMicrophone", "devicechange"]],
  ["voice-settings.tsx", join(web, "components/assistant/voice-settings.tsx"), ["listMicrophones", "devicechange", "runSttTest"]],
  ["stt route", join(web, "app/api/stt/route.ts"), ["POST", "audio"]],
  ["research-assistant", join(web, "components/assistant/research-assistant.tsx"), ["SCHOLAR-DOS", "SCHOLAR-84", "ra-screen", "ra-prompt", "voice.toggle"]],
  ["orb-window-css", join(web, "components/assistant/orb-window-css.ts"), ["width:176px", "width:132px", "ra-bezel"]],
  ["electron mic", join(root, "apps/desktop/electron/main.ts"), ["setupMediaPermissions", "media"]],
];

for (const [label, path, needles] of checks) {
  if (!existsSync(path)) {
    bad(`${label}: missing ${path}`);
    continue;
  }
  const txt = readFileSync(path, "utf8");
  const missing = needles.filter((n) => !txt.includes(n));
  if (missing.length) bad(`${label}: missing ${missing.join(", ")}`);
  else ok(`${label}`);
}

console.log("\n[2] Mobile (Android responsive) CRT + orb rules");
const css = readFileSync(join(web, "components/assistant/orb-window-css.ts"), "utf8");
if (css.includes("max-width:767px") && css.includes("width:128px") && css.includes("width:108px")) {
  ok("Mobile orb sizes (128 center / 108 dock) present");
} else bad("Mobile orb size rules incomplete");
if (css.includes("sheet-h") && css.includes("ra-wtool") && css.includes("font-size:16px")) {
  ok("Mobile bottom-sheet + 16px input (Android) present");
} else bad("Mobile sheet/input rules incomplete");

console.log(`\n=== result: ${failed === 0 ? "ALL PASSED" : `${failed} FAILED`} ===`);
process.exit(failed === 0 ? 0 : 1);
