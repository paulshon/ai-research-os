import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** TutorAgent — 개념 학습 1:1 소크라테스식 튜터 */
export class TutorAgent extends BaseAgent {
  readonly key = "tutor";
  readonly role = "개념 학습 1:1 소크라테스식 튜터";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 개념 학습 1:1 소크라테스식 튜터 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
