import { BaseAgent } from "../BaseAgent";
import type { AgentContext } from "../types";

/** WritingAgent — 학술 글쓰기 코칭 */
export class WritingAgent extends BaseAgent {
  readonly key = "writing";
  readonly role = "학술 글쓰기 코칭";
  protected systemPrompt(ctx: AgentContext) {
    return `당신은 학술 글쓰기 코칭 역할의 전문가입니다. 사용자 상태: ${JSON.stringify(ctx.state.identity)}`;
  }
}
