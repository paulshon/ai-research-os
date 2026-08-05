/** 미시 구조 — 문단별 체크리스트. */
export function MicroList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ol className="micro">
      {items.map((m, i) => (
        <li key={i}>{m}</li>
      ))}
    </ol>
  );
}
