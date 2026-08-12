/**
 * ove-8 — Vercel 배포 전 정적 검증 (ove-7 기능 + 빌드 산출물·중첩 아카이브 없음)
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => {
  failed++;
  console.error(`  FAIL  ${m}`);
};

console.log("=== ove-8 verification ===\n");

const nested = ["AI-Research-OS_RDOS_-s-renew-ove-3", "AI-Research-OS_RDOS_-s-renew-ove-4", "AI-Research-OS_RDOS_-s-renew-ove-5", "AI-Research-OS_RDOS_-s-renew-ove-6"];
for (const dir of nested) {
  if (existsSync(join(root, dir))) bad(`nested archive still present: ${dir}`);
  else ok(`no nested ${dir}`);
}

for (const junk of ["tmp-ko-sentences.txt", "_gen_demos.py", "_inspect_demos.py"]) {
  if (existsSync(join(root, junk))) bad(`junk file present: ${junk}`);
  else ok(`no ${junk}`);
}

const ra = join(root, "apps/web/components/assistant/research-assistant.tsx");
if (!existsSync(ra)) bad("research-assistant.tsx missing");
else {
  const txt = readFileSync(ra, "utf8");
  if (!txt.includes("const openChatOnly = useCallback")) bad("openChatOnly callback missing");
  else ok("openChatOnly defined");
  if (txt.includes("useRef<ReturnType<typeof setTimeout>")) bad("orb timer ref uses Node setTimeout type");
  else ok("orb timer ref browser-safe type");
}

const ove7 = spawnSync(process.execPath, [join(root, "scripts/verify-ove7.mjs")], {
  cwd: root,
  encoding: "utf8",
});
if (ove7.status !== 0) {
  bad("verify-ove7.mjs failed");
  if (ove7.stdout) process.stdout.write(ove7.stdout);
  if (ove7.stderr) process.stderr.write(ove7.stderr);
} else ok("verify-ove7.mjs");

console.log(`\n=== ${failed === 0 ? "ALL PASSED" : failed + " FAILED"} ===`);
process.exit(failed === 0 ? 0 : 1);
