"use client";

import { useState } from "react";

interface CitationSearchProps {
  projectId: string;
  onCitationAdded?: (citation: unknown) => void;
}

export default function CitationSearch({ projectId, onCitationAdded }: CitationSearchProps) {
  const [doi, setDoi] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!doi.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch(`/api/citations/lookup/${encodeURIComponent(doi)}`);
      const data = await resp.json();
      if (data.found) {
        setResult(data);
      } else {
        setError("해당 DOI를 찾을 수 없습니다.");
      }
    } catch {
      setError("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const addCitation = () => {
    if (result) {
      onCitationAdded?.(result);
      setResult(null);
      setDoi("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={doi}
          onChange={(e) => setDoi(e.target.value)}
          className="flex-1 px-3 py-2 rounded-[8px] bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]"
          placeholder="DOI 입력 (예: 10.1234/...)"
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-4 py-2 bg-[#4a6cf7] text-white rounded-[8px] text-[12px] font-medium disabled:opacity-50"
        >
          {loading ? "..." : "검색"}
        </button>
      </div>

      {error && <p className="text-[12px] text-[#ff7066]">{error}</p>}

      {result && (
        <div className="p-4 rounded-[12px] bg-[#1a1e2a] border border-white/[0.06]">
          <p className="text-[13px] font-semibold mb-1">{result.title as string}</p>
          <p className="text-[11px] text-white/30 mb-1">{(result.authors as string[])?.join(", ")}</p>
          <p className="text-[11px] text-white/20 font-['JetBrains_Mono',monospace]">
            {result.journal as string} ({result.year as number})
          </p>
          <button
            onClick={addCitation}
            className="mt-3 px-4 py-1.5 bg-[#5ebd7c]/10 text-[#5ebd7c] rounded-[6px] text-[11px] font-medium border border-[#5ebd7c]/20 hover:bg-[#5ebd7c]/20 transition-colors"
          >
            + 인용 추가
          </button>
        </div>
      )}
    </div>
  );
}
