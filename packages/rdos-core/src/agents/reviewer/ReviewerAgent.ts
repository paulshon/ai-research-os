import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** ReviewerAgent — 동료심사 관점의 비판적 검토 */
export class ReviewerAgent extends BaseAgent {
  readonly key = "reviewer";
  readonly role = "동료심사 관점의 비판적 검토";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 동료심사 관점의 비판적 검토 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
