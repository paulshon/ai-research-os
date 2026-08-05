"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Steps, type StepItem } from "@/components/ui/steps";
import { Sparkline } from "@/components/ui/table";
import { Icon } from "@/components/ui/icons";
import { AiBoundaryCard, CourseHelpCard } from "@/components/rdos/course-layout";
import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import { useLearnerStore } from "@/lib/project/learner";

const CONTENT = RDOS_LESSON_CONTENT.writing;

const DIFFICULTY = [
  { id: 1, title: "주제문 쓰기", prompt: "이 문단이 무엇을 주장할지 한 문장(주제문)으로 써 보세요." },
  { id: 2, title: "근거 하나 연결하기", prompt: "주제문 뒤에 이를 뒷받침하는 근거 문장 하나를 이어 써 보세요." },
  { id: 3, title: "문단 하나 완성하기", prompt: "주제문 + 근거 2~3개로 하나의 완결된 문단을 써 보세요." },
  { id: 4, title: "결과/논의 구분해 쓰기", prompt: "같은 발견에 대해 '결과' 문장과 '논의' 문장을 구분해 각각 써 보세요." },
  { id: 5, title: "헤지 표현 다듬기", prompt: "단정적 주장을 '~일 가능성이 있다'처럼 헤지 표현으로 고쳐 써 보세요." },
];

function critique(text: string) {
  const findings: string[] = [];
  if (text.length < 30) findings.push("문장이 너무 짧습니다 — 근거나 설명을 한 문장 더 추가해 보세요.");
  if (!/[.!?。]/.test(text.trim().slice(-1))) findings.push("문장이 온전히 끝맺지 않은 것 같습니다.");
  if (!/때문|므로|따라서|이는|왜냐하면/.test(text)) findings.push("근거를 연결하는 표현(따라서·이는·때문에 등)이 보이지 않습니다.");
  if (/반드시|항상|모든|절대/.test(text)) findings.push("단정적 표현이 있습니다 — 헤지 표현(~일 수 있다)을 고려해 보세요.");
  if (findings.length === 0) findings.push("기본 기준은 충족했습니다. 더 구체적인 근거를 추가하면 좋겠습니다.");
  return findings;
}

export default function RdosWritingPage() {
  const { writingSubmissions, writingFindings, recordWritingSubmission } = useLearnerStore();
  const [level, setLevel] = useState(1);
  const [text, setText] = useState("");
  const [result, setResult] = useState<string[] | null>(null);
  const current = DIFFICULTY.find((d) => d.id === level) ?? DIFFICULTY[0];

  const stepItems: StepItem[] = DIFFICULTY.map((d) => ({
    title: d.title,
    state: d.id < level ? "done" : d.id === level ? "now" : "todo",
  }));

  const sparkValues = useMemo(
    () => (writingFindings.length ? writingFindings : [0]),
    [writingFindings],
  );

  function submit() {
    const findings = critique(text);
    setResult(findings);
    recordWritingSubmission(findings.length);
  }

  return (
    <Page eyebrow="2 · 실습 훈련" title={CONTENT.label} description={CONTENT.intro}>
      <div className="grid g-wide">
        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h2>난이도 5단계</h2>
            </div>
            <Steps
              items={stepItems.map((s, i) => ({
                ...s,
                title: (
                  <button
                    type="button"
                    onClick={() => setLevel(DIFFICULTY[i].id)}
                    style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit", padding: 0 }}
                  >
                    {s.title}
                  </button>
                ),
              }))}
            />
          </Card>

          <Card>
            <div className="card-h">
              <h3>{level}단계 · {current.title}</h3>
              <span className="sp" />
              <Badge variant="mute">총 {writingSubmissions}회 제출</Badge>
            </div>
            <p className="fs-cap t2 mb3">{current.prompt}</p>
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="직접 문장을 써 보세요…" />
            <div className="row mt3">
              <Button variant="primary" size="sm" disabled={text.trim().length < 5} onClick={submit}>
                AI 피드백 요청
                <Icon name="arrow" size={13} />
              </Button>
              <span className="fs-cap t3">AI는 문제점을 지적할 뿐, 문장을 대신 고쳐 쓰지 않습니다.</span>
            </div>

            {result ? (
              <div className="crq mt4 t-style">
                <div className="crq-h">
                  <span className="no">AI 피드백 · {result.length}건 발견</span>
                </div>
                <blockquote>{text}</blockquote>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--t2)", fontSize: "var(--fs-cap)", lineHeight: 1.85 }}>
                  {result.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="card-h">
              <h3>예시 문단 — 참고용</h3>
              <span className="sp" />
              <Badge variant="warn">
                <Icon name="alert" size={12} />
                베끼지 마세요
              </Badge>
            </div>
            <div className="human-block">
              연구 참여자의 78%는 AI 창작물을 예술로 인정한다고 응답했다. 이는 기술 수용성이 창작 개념 자체의 확장으로
              이어지고 있음을 시사한다. 다만 응답자의 세대·전공에 따라 인식 차이가 있을 가능성이 있어, 후속 연구에서는
              하위 집단 비교가 필요하다.
            </div>
            <p className="fs-cap t3 mt3 mb0">
              이 예시는 패턴을 보여줄 뿐입니다. 그대로 옮겨 쓰면 내 문장 실력이 늘지 않습니다 — 같은 구조를 내 데이터로
              다시 써 보세요.
            </p>
          </Card>

          <AiBoundaryCard>
            AI는 여러분의 문단을 대신 써 주거나 예시 문장을 그대로 베껴 쓰도록 허용하지 않습니다. 이미 쓴 문장에 대한{" "}
            <b style={{ color: "var(--t1)" }}>비평(critique)만</b> 제공합니다.
          </AiBoundaryCard>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h3>세션별 발견된 개선점</h3>
            </div>
            <Sparkline values={sparkValues} tone="warm" label="세션별 AI가 지적한 개선점 수" />
            <p className="fs-cap t3 mt3 mb0">
              막대가 낮아질수록 스스로 고칠 수 있는 부분이 줄어들고 있다는 뜻입니다.
            </p>
          </Card>
          <Card>
            <div className="card-h">
              <h3>학습 목표</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--t2)", fontSize: "var(--fs-sm)", lineHeight: 1.9 }}>
              {CONTENT.objectives.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </Card>
          <CourseHelpCard
            links={[
              { label: "APA 인용 연습으로 이동", href: "/rdos/apa" },
              { label: "AI 튜터에게 물어보기", href: "/rdos/tutor" },
            ]}
          />
        </div>
      </div>
    </Page>
  );
}
