import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** MethodologyAgent — 연구방법·설계 자문 */
export class MethodologyAgent extends BaseAgent {
  readonly key = "methodology";
  readonly role = "연구방법·설계 자문";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 연구방법·설계 자문 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
