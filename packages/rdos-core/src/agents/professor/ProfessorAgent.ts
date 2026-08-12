import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** ProfessorAgent — 연구 전반 멘토링·방향 제시 */
export class ProfessorAgent extends BaseAgent {
  readonly key = "professor";
  readonly role = "연구 전반 멘토링·방향 제시";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 연구 전반 멘토링·방향 제시 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
