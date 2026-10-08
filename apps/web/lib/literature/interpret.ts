/* 대시보드 분석별 ‘쉬운 해석 · 학술적 해석 · 논문에 쓰기’ — 실제 계산 결과의 숫자로 문장을 만든다 */
import { type InterpCtx, type InterpMap } from "@/lib/literature/interpret-util";
import { interpretImpact, interpretTrend } from "@/lib/literature/interpret-a";
import { interpretAuthor, interpretGeo, interpretJournal } from "@/lib/literature/interpret-b";
import { interpretCitation, interpretFunding, interpretModel, interpretQuality, interpretTopicEvo, interpretTopicGap, interpretTopicMap, interpretTopicRs, interpretTopicYear } from "@/lib/literature/interpret-c";
import { interpretCross, interpretLongi } from "@/lib/literature/interpret-d";

export type { Interp, InterpCtx, InterpMap } from "@/lib/literature/interpret-util";

export function interpretSection(section: string, D: any, ctx: InterpCtx, cname: (c: string) => string = (c) => c): InterpMap {
  try {
    switch (section) {
      case "trend": return interpretTrend(D, ctx);
      case "impact": return interpretImpact(D, ctx);
      case "journal": return interpretJournal(D, ctx);
      case "author": return interpretAuthor(D, ctx);
      case "geo": return interpretGeo(D, ctx, cname);
      case "topic_year": return interpretTopicYear(D, ctx);
      case "topic_evo": return interpretTopicEvo(D, ctx);
      case "topic_rs": return interpretTopicRs(D, ctx);
      case "topic_map": return interpretTopicMap(D, ctx);
      case "topic_gap": return interpretTopicGap(D, ctx);
      case "funding": return interpretFunding(D, ctx);
      case "citation": return interpretCitation(D, ctx);
      case "model": return interpretModel(D, ctx);
      case "quality": return interpretQuality(D, ctx);
      case "longitudinal": return interpretLongi(D, ctx);
      case "cross": return interpretCross(D, ctx);
      default: return {};
    }
  } catch { return {};   // 해석 생성이 실패해도 차트는 그대로 보여 준다(정적 해설만 표시)
  }
}
