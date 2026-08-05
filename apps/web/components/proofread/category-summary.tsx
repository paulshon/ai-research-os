"use client";

import { cn } from "@/lib/utils";
import { PROOF_CATEGORY_LABEL, PROOF_CATEGORY_ORDER, type ProofCategory } from "@/lib/proofread/categories";
import type { Correction } from "@/lib/proofread/engine";

function breakdown(items: Correction[]): string {
  const bySub = new Map<string, number>();
  for (const it of items) bySub.set(it.subLabel, (bySub.get(it.subLabel) ?? 0) + 1);
  return Array.from(bySub.entries())
    .map(([label, n]) => `${label} ${n}`)
    .join(" · ");
}

export function CategorySummary({
  corrections,
  activeCategory,
  onSelect,
}: {
  corrections: Correction[];
  activeCategory: ProofCategory | "all";
  onSelect: (cat: ProofCategory | "all") => void;
}) {
  return (
    <div className="catgrid">
      {PROOF_CATEGORY_ORDER.map((cat) => {
        const items = corrections.filter((c) => c.category === cat);
        return (
          <button
            key={cat}
            type="button"
            className={cn("cat", activeCategory === cat && "on")}
            onClick={() => onSelect(activeCategory === cat ? "all" : cat)}
          >
            <span className="cn">{PROOF_CATEGORY_LABEL[cat]}</span>
            <span className={cn("cv", items.length === 0 && "zero")}>{items.length}</span>
            <span className="cd">{items.length ? breakdown(items) : "이상 없음"}</span>
          </button>
        );
      })}
    </div>
  );
}
