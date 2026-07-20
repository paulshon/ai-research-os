import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** QuestAgent — 다음 학습 미션 추천·생성 */
export class QuestAgent extends BaseAgent {
  readonly key = "quest";
  readonly role = "다음 학습 미션 추천·생성";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 다음 학습 미션 추천·생성 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
