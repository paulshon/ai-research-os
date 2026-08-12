import type { ResearchAgent, AgentContext, AgentReply } from "./types";
import { ProfessorAgent } from "./professor";
import { TutorAgent } from "./tutor";
import { MethodologyAgent } from "./methodology";
import { StatisticsAgent } from "./statistics";
import { WritingAgent } from "./writing";
import { ReviewerAgent } from "./reviewer";
import { AlignmentAgent } from "./alignment";
import { DefenseAgent } from "./defense";
import { QuestAgent } from "./quest";

/**
 * MultiAgentOrchestrator (L10)
 * 설계서의 협업 흐름을 구현:
 *   질문 → Professor → Methodology → Reviewer → 통합 피드백
 */
export class MultiAgentOrchestrator {
  private registry = new Map<string, ResearchAgent>();
  constructor() {
    [new ProfessorAgent(), new TutorAgent(), new MethodologyAgent(), new StatisticsAgent(), new WritingAgent(), new ReviewerAgent(), new AlignmentAgent(), new DefenseAgent(), new QuestAgent()].forEach(a => this.registry.set(a.key, a));
  }
  agent(key: string) { return this.registry.get(key); }

  /** 파이프라인(순차 협업): 각 에이전트 출력이 다음 컨텍스트로 누적된다. */
  async pipeline(order: string[], ctx: AgentContext): Promise<AgentReply[]> {
    const replies: AgentReply[] = [];
    let acc = ctx.question;
    for (const key of order) {
      const agent = this.registry.get(key);
      if (!agent) continue;
      const r = await agent.run({ ...ctx, question: acc });
      replies.push(r);
      acc = `${acc}\n[${r.agent}] ${r.content}`;
    }
    return replies;
  }

  /** 기본 자문 파이프라인 */
  consult(ctx: AgentContext) {
    return this.pipeline(["professor", "methodology", "reviewer"], ctx);
  }
}
