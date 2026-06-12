import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** AlignmentAgent — 연구 정합성 검사 */
export class AlignmentAgent extends BaseAgent {
  readonly key = "alignment";
  readonly role = "연구 정합성 검사";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 연구 정합성 검사 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
