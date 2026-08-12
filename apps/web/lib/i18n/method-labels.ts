/**
 * method-labels.ts — v16 i18n helper for the Research Methods engine.
 *
 * The registry (lib/method/registry.ts) stores everything in Korean.
 * At render time we look up per-id keys and translate categories, method names,
 * summaries, and step labels via t(). Anything without a mapping falls back
 * to the original registry string (Korean).
 */
import { METHOD_CATEGORIES, type MethodCategory, type MethodType, type MethodStep } from "@/lib/method/registry";

const CAT_KEYS: Record<string, string> = {
  "🟢 질적 분석형": "methodEngine.catQual",
  "🔵 양적 분석형": "methodEngine.catQuant",
};

const TYPE_NAME_KEYS: Record<string, string> = {
  qca: "methodEngine.qcaName",
  thematic: "methodEngine.thematicName",
  grounded: "methodEngine.groundedName",
  "basic-stats": "methodEngine.basicStatsName",
};

const TYPE_SUMMARY_KEYS: Record<string, string> = {
  qca: "methodEngine.qcaSummary",
  thematic: "methodEngine.thematicSummary",
  grounded: "methodEngine.groundedSummary",
  "basic-stats": "methodEngine.basicStatsSummary",
};

/** Per-type map: step.key → i18n label key. */
const STEP_LABEL_KEYS: Record<string, Record<string, string>> = {
  qca: {
    project: "methodEngine.qcaProject",
    collect: "methodEngine.qcaCollect",
    clean: "methodEngine.qcaClean",
    frequency: "methodEngine.qcaFrequency",
    codebook: "methodEngine.qcaCodebook",
    coding: "methodEngine.qcaCoding",
    theme: "methodEngine.qcaTheme",
    network: "methodEngine.qcaNetwork",
    interpret: "methodEngine.qcaInterpret",
    export: "methodEngine.qcaExport",
  },
  thematic: {
    familiarize: "methodEngine.thmFamiliarize",
    "initial-codes": "methodEngine.thmInitialCodes",
    "search-themes": "methodEngine.thmSearchThemes",
    "review-themes": "methodEngine.thmReviewThemes",
    "define-themes": "methodEngine.thmDefineThemes",
    report: "methodEngine.thmReport",
  },
  grounded: {
    open: "methodEngine.gtOpen",
    axial: "methodEngine.gtAxial",
    selective: "methodEngine.gtSelective",
    memo: "methodEngine.gtMemo",
  },
  "basic-stats": {
    overview: "methodEngine.bsOverview",
    data: "methodEngine.bsData",
    preview: "methodEngine.bsPreview",
    steps: "methodEngine.bsSteps",
    run: "methodEngine.bsRun",
    export: "methodEngine.bsExport",
  },
};

function localizeStep(typeId: string, step: MethodStep, t: (k: string) => string): MethodStep {
  const key = STEP_LABEL_KEYS[typeId]?.[step.key];
  return key ? { ...step, label: t(key) } : step;
}

function localizeType(ty: MethodType, t: (k: string) => string): MethodType {
  return {
    ...ty,
    name: TYPE_NAME_KEYS[ty.id] ? t(TYPE_NAME_KEYS[ty.id]) : ty.name,
    summary: TYPE_SUMMARY_KEYS[ty.id] ? t(TYPE_SUMMARY_KEYS[ty.id]) : ty.summary,
    steps: ty.steps.map((s) => localizeStep(ty.id, s, t)),
  };
}

export function localizeMethodCategories(t: (k: string) => string): MethodCategory[] {
  return METHOD_CATEGORIES.map((c) => ({
    ...c,
    cat: CAT_KEYS[c.cat] ? t(CAT_KEYS[c.cat]) : c.cat,
    types: c.types.map((ty) => localizeType(ty, t)),
  }));
}

export function localizeMethodType(ty: MethodType, t: (k: string) => string): MethodType {
  return localizeType(ty, t);
}
