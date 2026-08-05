import { splitMacroFlow } from "@/lib/structure-format";

/** 거시 구조 — "A → B → C" 를 흐름 칩으로 표시한다. */
export function MacroFlow({ value }: { value: string }) {
  const steps = splitMacroFlow(value);
  if (!steps.length) return null;
  return (
    <div className="macro">
      {steps.map((s, i) => (
        <span key={i}>{s}</span>
      ))}
    </div>
  );
}
