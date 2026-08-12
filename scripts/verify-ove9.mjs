/**
 * ove-9 — 모바일 오브/캡션 겹침 방지 + ove-8 배포 검증
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps", "web");
let failed = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => {
  failed++;
  console.error(`  FAIL  ${m}`);
};

console.log("=== ove-9 verification ===\n");

const css = join(web, "components/assistant/orb-window-css.ts");
if (!existsSync(css)) bad("orb-window-css.ts missing");
else {
  const txt = readFileSync(css, "utf8");
  if (!txt.includes("top:calc(100% + 14px)")) bad("mobile caption not below orb (top:100%+14px)");
  else ok("caption below orb");
  if (txt.includes("bottom:-30px") || txt.includes("bottom:-28px")) bad("old bottom-offset caption still present");
  else ok("old overlapping caption offset removed");
  if (!txt.includes("width:max-content") || !txt.includes("white-space:nowrap")) {
    bad("caption not nowrap/max-content");
  } else ok("caption single-line width");
}

const page = join(web, "app/(dashboard)/dashboard/page.tsx");
if (!existsSync(page)) bad("dashboard page missing");
else {
  const txt = readFileSync(page, "utf8");
  if (!txt.includes("max-[767px]:h-[176px]")) bad("dashboard mobile slot not tall enough for caption");
  else ok("dashboard mobile slot includes caption");
}

const ra = join(web, "components/assistant/research-assistant.tsx");
if (!existsSync(ra)) bad("research-assistant.tsx missing");
else {
  const txt = readFileSync(ra, "utf8");
  if (!txt.includes("Math.min(r.width, r.height)")) bad("orb not anchored to top of tall slot");
  else ok("orb anchored to slot top square");
}

const ove8 = spawnSync(process.execPath, [join(root, "scripts/verify-ove8.mjs")], {
  cwd: root,
  encoding: "utf8",
});
if (ove8.status !== 0) {
  bad("verify-ove8.mjs failed");
  if (ove8.stdout) process.stdout.write(ove8.stdout);
  if (ove8.stderr) process.stderr.write(ove8.stderr);
} else ok("verify-ove8.mjs");

console.log(`\n=== ${failed === 0 ? "ALL PASSED" : failed + " FAILED"} ===`);
process.exit(failed === 0 ? 0 : 1);
