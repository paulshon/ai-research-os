import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** DefenseAgent — 심사·디펜스 모의 질의 */
export class DefenseAgent extends BaseAgent {
  readonly key = "defense";
  readonly role = "심사·디펜스 모의 질의";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 심사·디펜스 모의 질의 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
