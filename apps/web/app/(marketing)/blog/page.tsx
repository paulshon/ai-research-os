const POSTS = [
  { date: "2026.05.15", title: "AI Research OS v0.1 출시", desc: "Cloud-Collaborative, Local-First AI Research Operating System의 첫 번째 버전을 소개합니다.", tag: "Release", color: "#6c8cff" },
  { date: "2026.05.10", title: "Local First 아키텍처를 선택한 이유", desc: "왜 연구 파일을 클라우드가 아닌 사용자 PC에 저장하는 구조를 선택했는지 설명합니다.", tag: "Architecture", color: "#3ecfb2" },
  { date: "2026.05.05", title: "Gemini API 키 기반 AI 비용 구조", desc: "플랫폼에 AI 비용을 포함하지 않고 사용자 개인 API 키를 사용하는 전략의 장점.", tag: "Strategy", color: "#e8b84b" },
  { date: "2026.04.28", title: "CRDT 기반 실시간 협업 구현기", desc: "Yjs + Hocuspocus로 논문 공동 편집을 구현한 기술적 과정을 공유합니다.", tag: "Engineering", color: "#a78bfa" },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="pt-28 pb-16 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#e8b84b] mb-3 font-medium">Blog</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-nanum-myeongjo font-bold mb-5">블로그 & 업데이트</h1>
      </div>
      <div className="max-w-3xl mx-auto px-6 pb-28 space-y-5">
        {POSTS.map((p, i) => (
          <article key={i} className="group p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] text-white/20 font-['JetBrains_Mono',monospace]">{p.date}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: `${p.color}12`, color: p.color }}>{p.tag}</span>
            </div>
            <h2 className="text-[18px] font-semibold mb-2 group-hover:text-[#6c8cff] transition-colors">{p.title}</h2>
            <p className="text-[13px] text-white/35 leading-relaxed">{p.desc}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
