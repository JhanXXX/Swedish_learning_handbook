import { useState, useMemo, useRef, useEffect } from "react";
import { type Translations } from "../i18n";
import { useProgress } from "../hooks/useProgress";
import SpeakButton from "../components/SpeakButton";
import nounsRaw from "../data/nouns.json";
import verbsRaw from "../data/verbs.json";

interface Props { tr: Translations }

type QType = "verb_present" | "verb_past" | "verb_supinum" | "noun_definite" | "noun_plural";

interface Question {
  id: string;
  type: QType;
  prompt: string;
  answer: string;
  hint?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string) {
  return s.trim().toLowerCase()
    .replace(/å/g, "å").replace(/ä/g, "ä").replace(/ö/g, "ö");
}

function buildQuestions(): Question[] {
  const qs: Question[] = [];

  verbsRaw.forEach((v) => {
    if (v.present && v.present !== "—") {
      qs.push({ id: `${v.id}_pres`, type: "verb_present", prompt: v.infinitive, answer: v.present, hint: v.zh });
    }
    if (v.past && v.past !== "—") {
      qs.push({ id: `${v.id}_past`, type: "verb_past", prompt: v.infinitive, answer: v.past, hint: v.zh });
    }
    if (v.supinum && v.supinum !== "—") {
      qs.push({ id: `${v.id}_sup`, type: "verb_supinum", prompt: v.infinitive, answer: v.supinum, hint: v.zh });
    }
  });

  nounsRaw.forEach((n) => {
    if (n.definite_sg && n.definite_sg !== "—") {
      qs.push({ id: `${n.id}_def`, type: "noun_definite", prompt: n.indefinite_sg, answer: n.definite_sg, hint: n.zh });
    }
    if (n.indefinite_pl && n.indefinite_pl !== "—" && !n.indefinite_pl.includes("不可数")) {
      qs.push({ id: `${n.id}_pl`, type: "noun_plural", prompt: n.indefinite_sg, answer: n.indefinite_pl, hint: n.zh });
    }
  });

  return shuffle(qs).slice(0, 20);
}

export default function Quiz({ tr }: Props) {
  const q = tr.quiz;
  const { mark } = useProgress();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function start() {
    setQuestions(buildQuestions());
    setCurrent(0);
    setInput("");
    setChecked(false);
    setScore(0);
    setFinished(false);
  }

  useEffect(() => { start(); }, []);
  useEffect(() => { if (!checked) inputRef.current?.focus(); }, [checked, current]);

  function check() {
    if (!input.trim()) return;
    const cq = questions[current];
    const correct = normalize(input) === normalize(cq.answer);
    setIsCorrect(correct);
    setChecked(true);
    if (correct) {
      setScore((s) => s + 1);
      mark(cq.id, "mastered");
    } else {
      mark(cq.id, "learning");
    }
  }

  function next() {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setInput("");
      setChecked(false);
    }
  }

  if (questions.length === 0) return null;

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="page" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{pct >= 80 ? "🌟" : pct >= 60 ? "👍" : "💪"}</div>
        <h2 style={{ color: "var(--blue)", marginBottom: "0.5rem" }}>{q.score}: {score} / {questions.length}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", marginBottom: "1.5rem" }}>{pct}%</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button className="btn-primary" onClick={start}>{q.restart}</button>
        </div>
      </div>
    );
  }

  const cq = questions[current];

  return (
    <div className="page">
      <div className="page-header">
        <h1>{q.title}</h1>
        <p>{q.subtitle}</p>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ flex: 1, background: "var(--border)", borderRadius: 8, height: 6 }}>
          <div style={{
            background: "var(--blue)", height: "100%", borderRadius: 8,
            width: `${(current / questions.length) * 100}%`, transition: "width 0.3s",
          }} />
        </div>
        <span style={{ fontSize: "0.88rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {current + 1} / {questions.length} · {q.score}: {score}
        </span>
      </div>

      <div className="card" style={{ padding: "2rem", maxWidth: 560 }}>
        {/* Type badge */}
        <div style={{ marginBottom: "1rem" }}>
          <span className="badge">{q.type[cq.type]}</span>
        </div>

        {/* Prompt */}
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: "0.5rem" }}>
          {q.prompt[cq.type]}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--blue)" }}>
            {cq.prompt}
          </span>
          <SpeakButton text={cq.prompt} size="sm" />
        </div>
        {cq.hint && (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            {cq.hint}
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") checked ? next() : check(); }}
          placeholder="…"
          disabled={checked}
          style={{
            width: "100%", marginBottom: "1rem",
            fontSize: "1.1rem", padding: "0.65rem 1rem",
            borderColor: checked ? (isCorrect ? "#1a7a3a" : "#c0392b") : undefined,
            background: checked ? (isCorrect ? "#e6f9ed" : "#fdecea") : undefined,
          }}
        />

        {/* Feedback */}
        {checked && (
          <div style={{
            marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: 8,
            background: isCorrect ? "#e6f9ed" : "#fdecea",
            color: isCorrect ? "#1a7a3a" : "#c0392b",
            fontWeight: 600,
          }}>
            {isCorrect ? `✓ ${q.correct}` : `✗ ${q.wrong}: ${q.correctAnswer} = ${cq.answer}`}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {!checked
            ? <button className="btn-primary" onClick={check} style={{ flex: 1 }}>{q.check}</button>
            : <button className="btn-yellow" onClick={next} style={{ flex: 1 }}>
                {current + 1 >= questions.length ? q.finish : q.next} →
              </button>
          }
        </div>
      </div>
    </div>
  );
}
