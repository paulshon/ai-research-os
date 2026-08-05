/* QCA engine verification harness (v53) — runs the full ported pipeline on the
 * embedded sample and asserts parity with the Python reference (pure-python
 * coding path + networkx graph metrics) for the generative-AI discourse sample. */
import { QcaProject } from "../../../apps/web/lib/method/qca/project";
import { importRawText } from "../../../apps/web/lib/method/qca/importer";
import { cleanProject } from "../../../apps/web/lib/method/qca/cleaner";
import * as freq from "../../../apps/web/lib/method/qca/frequency";
import { installDefaultCodebook } from "../../../apps/web/lib/method/qca/codebook";
import { codeProject, codingStats } from "../../../apps/web/lib/method/qca/coding";
import { buildCategories, metaCategorySummary } from "../../../apps/web/lib/method/qca/category";
import { generateThemes } from "../../../apps/web/lib/method/qca/theme";
import * as net from "../../../apps/web/lib/method/qca/network";
import { generateAll } from "../../../apps/web/lib/method/qca/interpret";
import { buildResultsWorkbook, exportCodingCsv, exportFullJson } from "../../../apps/web/lib/method/qca/exporter";
import { SAMPLE_CORPUS, SAMPLE_PROJECT } from "../../../apps/web/lib/method/qca/sample-corpus";

let failures = 0;
function check(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  const ok = g === w;
  if (!ok) failures++;
  console.log(`${ok ? "\u2713" : "\u2717"} ${label}: got=${g}${ok ? "" : ` want=${w}`}`);
}
const canon = (pairs: Array<[string, number]>) =>
  [...pairs].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));

function main() {
  const p = new QcaProject(SAMPLE_PROJECT.name, SAMPLE_PROJECT.research_question);
  const imp = importRawText(p, "\uc0d8\ud50c \ucf54\ud37c\uc2a4", SAMPLE_CORPUS.join("\n"));
  check("imported sentences", imp.sentences, 36);

  cleanProject(p, { doLemma: true });
  check("summary", freq.summary(p), { sentences: 36, tokens: 272, vocabulary: 179, avg_tokens_per_sentence: 7.56 });
  check("top words", freq.wordFrequency(p, 8),
    [["ai", 11], ["model", 6], ["automation", 4], ["human", 4], ["through", 4], ["new", 4], ["policy", 4], ["draft", 3]]);

  installDefaultCodebook(p);
  check("codes", p.codes().length, 6);

  const { assigned, ambiguous } = codeProject(p, { mode: "hybrid", multiCode: true, maxCodes: 2 });
  check("assigned", assigned, 49);
  check("ambiguous", ambiguous, 1);
  check("by_code", codingStats(p).by_code,
    [["\uc790\ub3d9\ud654\u00b7\uc0dd\uc0b0\uc131 \ud5a5\uc0c1", 11], ["\ud22c\uba85\uc131\uacfc \ucc45\uc784", 9], ["\uc778\uac04-AI \ud611\uc5c5", 8], ["\uad50\uc721\u00b7\uaddc\uc81c \ub300\uc751", 8], ["\ub178\ub3d9\uc2dc\uc7a5 \ubcc0\ud654", 7], ["\ud3b8\ud5a5\uacfc \uacf5\uc815\uc131", 6]]);

  buildCategories(p);
  check("meta categories", metaCategorySummary(p).map((m) => [m.meta, m.freq]),
    [["\uae30\uc220 \uc5ed\ub7c9 \ub2f4\ub860", 19], ["\uc724\ub9ac\u00b7\uc2e0\ub8b0 \ub2f4\ub860", 15], ["\uc0ac\ud68c\u00b7\uc81c\ub3c4 \ub2f4\ub860", 15]]);
  check("themes", generateThemes(p).map((t) => [t.name, t.freq]),
    [["\uae30\uc220 \uc5ed\ub7c9 \ub2f4\ub860", 19], ["\uc724\ub9ac\u00b7\uc2e0\ub8b0 \ub2f4\ub860", 15], ["\uc0ac\ud68c\u00b7\uc81c\ub3c4 \ub2f4\ub860", 15]]);

  const kw = net.buildKeywordNetwork(p, 40, 2);
  const cn = net.buildCodeNetwork(p, 1);
  const cy = net.buildCityNetwork(p, undefined, 1);
  check("keyword links", kw.length, 24);
  check("code links", cn.length, 7);
  check("city links", cy.length, 7);
  const km = net.metrics(p, "keyword");
  check("kw nodes", km.nodes, 29);
  check("kw edges", km.edges, 24);
  check("degree canon top5", canon(km.degree).slice(0, 5),
    [["ai", 9], ["policy", 3], ["regulation", 3], ["acros", 2], ["assistant", 2]]);
  check("communities", km.communities, 9);
  check("modularity", km.modularity, 0.6149);
  check("betweenness canon top3", canon(km.betweenness).slice(0, 3),
    [["ai", 0.078], ["assistant", 0.0053], ["human", 0.0053]]);

  generateAll(p).then((texts) => {
    check("methodology mentions 36 units", texts.methodology.includes("36\uac1c \ubd84\uc11d\ub2e8\uc704"), true);
    check("results mentions tokens 272", texts.results.includes("272\uac1c \ud1a0\ud070"), true);
    check("conclusion non-empty", texts.conclusion.length > 50, true);
    check("no brand word in interpretation",
      /\ud0c0\uc774\ud3ec\uc794\uce58/.test(texts.methodology + texts.results + texts.discussion + texts.conclusion), false);

    const wbk = buildResultsWorkbook(p);
    check("workbook sheets", wbk.map((x) => x.name), ["Codebook", "Coding", "Categories", "MetaCategories", "Themes", "Networks"]);
    check("coding sheet rows", wbk[1].rows.length, 49);
    check("csv data rows", exportCodingCsv(p).trim().split("\n").length - 1, 49);
    check("json coding length", JSON.parse(exportFullJson(p)).coding.length, 49);

    console.log(failures === 0 ? "\n\u2705 ALL CHECKS PASSED \u2014 TS port matches Python reference (new sample)" : `\n\u274c ${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
  });
}

main();
