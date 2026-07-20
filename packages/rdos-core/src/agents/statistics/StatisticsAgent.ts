import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** StatisticsAgent — 통계 분석·해석 자문 */
export class StatisticsAgent extends BaseAgent {
  readonly key = "statistics";
  readonly role = "통계 분석·해석 자문";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 통계 분석·해석 자문 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
