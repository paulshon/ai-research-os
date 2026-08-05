"use client";

import { useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Toggle } from "@/components/inspector/controls";
import { AiBoundaryCard } from "@/components/rdos/course-layout";
import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import { KNOWLEDGE_TERMS } from "@/lib/rdos/knowledge-core";
import { useLearnerStore } from "@/lib/project/learner";

const CONTENT = RDOS_LESSON_CONTENT.tutor;

const REFUSE_PATTERNS = /대신\s*써|써\s*줘|작성해\s*줘|써주세요|작성해주세요|대신\s*작성/;

type Msg = {
  id: string;
  role: "user" | "ai";
  text: string;
  refused?: boolean;
  term?: string;
};

function findTerm(text: string) {
  return KNOWLEDGE_TERMS.find((t) => text.includes(t.ko));
}

function reply(text: string, followUp: boolean): Msg {
  if (REFUSE_PATTERNS.test(text)) {
    return {
      id: crypto.randomUUID(),
      role: "ai",
      refused: true,
      text: "그 부분은 제가 대신 써 드릴 수 없어요. 대신 어떤 내용을 담고 싶은지 먼저 말해 주시면, 스스로 쓰도록 질문으로 도와드릴게요.",
    };
  }
  const term = findTerm(text);
  if (term) {
    return {
      id: crypto.randomUUID(),
      role: "ai",
      term: term.ko,
      text: `${term.ko}(${term.en})는 ${term.definition} ${followUp ? `여러분의 연구에서는 ${term.ko}를 어떻게 다루고 있나요?` : ""}`,
    };
  }
  const base = `좋은 질문이에요. ${CONTENT.intro} 지금 막힌 부분을 조금 더 구체적으로 말해 주시면 단계별로 짚어드릴게요.`;
  return {
    id: crypto.randomUUID(),
    role: "ai",
    text: followUp ? `${base} 어느 장/단계에서 막히셨나요?` : base,
  };
}

export default function RdosTutorPage() {
  const { addVocab, vocabulary } = useLearnerStore();
  const [followUp, setFollowUp] = useState<"on" | "off">("on");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "ai",
      text: `안녕하세요, ${CONTENT.label} 튜터입니다. 지금 보고 있는 화면이나 막힌 개념에 대해 편하게 물어보세요. 과제를 대신 써 드리지는 않지만, 스스로 답에 다다르도록 함께 생각해 볼게요.`,
    },
  ]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text };
    const aiMsg = reply(text, followUp === "on");
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput("");
  }

  return (
    <Page eyebrow="3 · 상시 지원" title={CONTENT.label} description={CONTENT.intro}>
      <div className="grid g-wide">
        <Card style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: 480 }}>
          <div className="card-h" style={{ padding: "var(--s4) var(--s5) 0" }}>
            <h3>대화</h3>
            <span className="sp" />
            <Badge variant="info">문맥 인식 ON</Badge>
          </div>
          <div className="col" style={{ flex: 1, gap: 14, padding: "var(--s4) var(--s5)", overflowY: "auto" }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                }}
              >
                <div
                  className={m.role === "ai" ? "glass-flat" : undefined}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--r-md)",
                    background: m.role === "user" ? "linear-gradient(140deg,var(--accent),var(--accent-2))" : undefined,
                    color: "var(--t1)",
                    fontSize: "var(--fs-sm)",
                    lineHeight: 1.75,
                    border: m.refused ? "1px solid rgba(232,184,75,.35)" : undefined,
                  }}
                >
                  {m.refused ? (
                    <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                      <Icon name="alert" size={13} />
                      <b className="fs-cap" style={{ color: "var(--warn)" }}>
                        대신 해 드릴 수 없어요
                      </b>
                    </div>
                  ) : null}
                  {m.text}
                </div>
                {m.role === "ai" && m.term ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt2"
                    disabled={vocabulary.some((v) => v.term === m.term)}
                    onClick={() => addVocab(m.term!)}
                  >
                    <Icon name="brain" size={13} />
                    {vocabulary.some((v) => v.term === m.term) ? "지식 코어에 있음" : `"${m.term}" 지식 코어에 추가`}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--hairline)", padding: "var(--s4) var(--s5)" }}>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                placeholder="막힌 부분을 물어보세요…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <Button variant="primary" onClick={send} disabled={!input.trim()}>
                보내기
              </Button>
            </div>
          </div>
        </Card>

        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h3>후속 질문</h3>
            </div>
            <Toggle
              label="후속 질문 사용 여부"
              value={followUp}
              onChange={setFollowUp}
              options={[
                { value: "on", label: "켜짐" },
                { value: "off", label: "꺼짐" },
              ]}
            />
            <p className="fs-cap t3 mt3 mb0" style={{ lineHeight: 1.7 }}>
              켜두면 AI가 답변 끝에 되짚어보는 질문을 덧붙여, 여러분이 스스로 더 생각하도록 돕습니다.
            </p>
          </Card>
          <AiBoundaryCard>
            AI 튜터는 과제·문단·참고문헌을 대신 써 주지 않습니다. "대신 써 주세요" 같은 요청은 정중히 거절하고,
            대신 스스로 답에 다다르도록 질문으로 안내합니다.
          </AiBoundaryCard>
        </div>
      </div>
    </Page>
  );
}
