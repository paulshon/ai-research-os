import { ResearchOS } from "../os";
import { MultiAgentOrchestrator } from "../agents";
import { createEngines } from "../engines";

/** API 핸들러가 OS/엔진/에이전트를 어떻게 연결하는지 보여주는 참조 구현. */
export function createApp() {
  const os = new ResearchOS();
  const engines = createEngines(os);
  const agents = new MultiAgentOrchestrator();

  return {
    async masterConcept(userId: string, nodeId: string) {
      await os.boot(userId);
      const deltas = await engines["research-language"].masterConcept(userId, nodeId);
      return { deltas, state: os.state(userId) };
    },
    async completeQuest(userId: string, questId: string) {
      await os.boot(userId);
      const deltas = await engines["research-quest"].completeQuest(userId, questId);
      return { deltas, state: os.state(userId) };
    },
    async consult(userId: string, question: string) {
      await os.boot(userId);
      return agents.consult({ userId, state: os.state(userId), question });
    },
    state: (userId: string) => os.state(userId),
    os, engines, agents,
  };
}
