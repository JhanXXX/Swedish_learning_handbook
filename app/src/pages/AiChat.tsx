import { useState, useRef, useEffect } from "react";
import { type Translations } from "../i18n";
import nounsRaw from "../data/nouns.json";
import verbsRaw from "../data/verbs.json";

interface Props { tr: Translations }

type Provider = "openai" | "anthropic" | "gemini";
type Level = "beginner" | "intermediate";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ProgressContext {
  mastered: string[];
  learning: string[];
  masteredCount: number;
  learningCount: number;
}

const MODELS: Record<Provider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  anthropic: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-7"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro"],
};

function readProgressContext(): ProgressContext {
  let raw: Record<string, string> = {};
  try { raw = JSON.parse(localStorage.getItem("sv_progress") ?? "{}"); } catch {}

  const masteredIds = new Set(Object.entries(raw).filter(([, s]) => s === "mastered").map(([id]) => id));
  const learningIds = new Set(Object.entries(raw).filter(([, s]) => s === "learning").map(([id]) => id));

  const mastered: string[] = [];
  const learning: string[] = [];

  nounsRaw.forEach((n) => {
    const base = n.base || n.indefinite_sg;
    if (masteredIds.has(n.id)) mastered.push(base);
    else if (learningIds.has(n.id)) learning.push(base);
  });

  verbsRaw.forEach((v) => {
    if (masteredIds.has(v.id)) mastered.push(v.infinitive);
    else if (learningIds.has(v.id)) learning.push(v.infinitive);
  });

  return {
    mastered: mastered.slice(0, 40),
    learning: learning.slice(0, 20),
    masteredCount: mastered.length,
    learningCount: learning.length,
  };
}

function buildSystemPrompt(
  topic: string, level: Level, feedback: boolean,
  lang: "zh" | "en", useMemory: boolean
): string {
  const levelDesc = level === "beginner"
    ? "A1-A2 level learner who knows basic Swedish words, common nouns, present tense, and simple sentences"
    : "B1-B2 level learner comfortable with most tenses and common vocabulary";

  const feedbackInstr = feedback
    ? "After each of the user's Swedish messages, briefly note any grammar or vocabulary errors in parentheses (in the user's language), then continue the conversation naturally."
    : "Focus on natural conversation flow.";

  let progressSection = "";
  if (useMemory) {
    const ctx = readProgressContext();
    if (ctx.masteredCount > 0 || ctx.learningCount > 0) {
      progressSection = `
## Learner's current vocabulary progress
- Words/verbs already mastered (${ctx.masteredCount} total): ${ctx.mastered.join(", ")}${ctx.mastered.length < ctx.masteredCount ? "…" : ""}
- Words/verbs currently being learned (${ctx.learningCount} total): ${ctx.learning.join(", ")}${ctx.learning.length < ctx.learningCount ? "…" : ""}

Use this to personalize the conversation:
- Freely use the mastered words — the learner will recognize them and feel confident.
- Gently incorporate the "learning" words to help reinforce them.
- Avoid introducing brand-new vocabulary unless the learner asks or the topic requires it.
- If the learner uses a word from their mastered list correctly, briefly acknowledge it with encouragement.
`;
    } else {
      progressSection = `
## Learner's progress
The learner has not yet used the flashcard or quiz features, so no vocabulary data is available. Treat them as a beginner and use very simple, common Swedish words.
`;
    }
  }

  return `You are a friendly, encouraging Swedish language tutor. ${
    lang === "zh"
      ? "The learner's native language is Mandarin Chinese. You may explain grammar in Chinese when needed, but always respond in Swedish first."
      : "Respond primarily in Swedish, with brief English clarifications when needed."
  }

The learner is a ${levelDesc}.

Conversation topic: ${topic}
${progressSection}
Instructions:
- Always include the Swedish text prominently.
- Keep sentences at the right difficulty level.
- ${feedbackInstr}
- If the user writes in English or Chinese, gently encourage them to try in Swedish too.
- Celebrate effort and progress.
`;
}

async function extractApiError(res: Response, provider: string): Promise<string> {
  try {
    const body = await res.json();
    const msg = body?.error?.message ?? body?.message ?? body?.error?.error ?? null;
    if (msg) return `${provider} ${res.status}: ${msg}`;
  } catch {}
  return `${provider} ${res.status} ${res.statusText}`;
}

async function callOpenAI(
  apiKey: string, model: string, messages: Message[], systemPrompt: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 600,
    }),
  });
  if (!res.ok) throw new Error(await extractApiError(res, "OpenAI"));
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(
  apiKey: string, model: string, messages: Message[], systemPrompt: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) throw new Error(await extractApiError(res, "Anthropic"));
  const data = await res.json();
  return data.content[0].text;
}

async function callGemini(
  apiKey: string, model: string, messages: Message[], systemPrompt: string
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 600 },
      }),
    }
  );
  if (!res.ok) throw new Error(await extractApiError(res, "Gemini"));
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

function keyFormatHint(provider: Provider, key: string): string | null {
  if (!key) return null;
  if (provider === "openai" && !key.startsWith("sk-")) return "OpenAI keys start with \"sk-\"";
  if (provider === "anthropic" && !key.startsWith("sk-ant-")) return "Anthropic keys start with \"sk-ant-\"";
  if (provider === "gemini" && !key.startsWith("AIza")) return "Gemini keys start with \"AIza\"";
  return null;
}

const KEY_STORE: Record<Provider, string> = {
  openai: "sv_key_openai",
  anthropic: "sv_key_anthropic",
  gemini: "sv_key_gemini",
};

export default function AiChat({ tr }: Props) {
  const c = tr.aiChat;
  const lang = (localStorage.getItem("lang") ?? "zh") as "zh" | "en";

  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORE.openai) ?? "");
  const [model, setModel] = useState(MODELS.openai[0]);
  const [topic, setTopic] = useState("freeChat");
  const [level, setLevel] = useState<Level>("beginner");
  const [feedback, setFeedback] = useState(true);
  const [useMemory, setUseMemory] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function switchProvider(p: Provider) {
    setProvider(p);
    setModel(MODELS[p][0]);
    setApiKey(localStorage.getItem(KEY_STORE[p]) ?? "");
  }

  function saveKey(key: string) {
    setApiKey(key);
    localStorage.setItem(KEY_STORE[provider], key);
  }

  async function startChat() {
    if (!apiKey.trim()) { setError(c.keyRequired); return; }
    setError("");
    setMessages([]);
    setStarted(true);
    setLoading(true);
    const topicLabel = (c.topics as Record<string, string>)[topic] ?? topic;
    const sysPrompt = buildSystemPrompt(topicLabel, level, feedback, lang, useMemory);
    const openingMsg: Message = {
      role: "user",
      content: lang === "zh"
        ? `请用瑞典语和我开始一段关于「${topicLabel}」的对话。先用简单的瑞典语跟我打招呼。`
        : `Please start a Swedish conversation with me about "${topicLabel}". Open with a simple Swedish greeting.`,
    };
    try {
      const reply = await callProvider(provider, apiKey, model, [openingMsg], sysPrompt);
      setMessages([{ role: "assistant", content: reply }]);
    } catch (e) {
      setError((e as Error).message ?? c.error);
      setStarted(false);
    } finally {
      setLoading(false);
    }
  }

  async function callProvider(p: Provider, key: string, mdl: string, msgs: Message[], sys: string): Promise<string> {
    if (p === "openai") return callOpenAI(key, mdl, msgs, sys);
    if (p === "anthropic") return callAnthropic(key, mdl, msgs, sys);
    return callGemini(key, mdl, msgs, sys);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const topicLabel = (c.topics as Record<string, string>)[topic] ?? topic;
    const sysPrompt = buildSystemPrompt(topicLabel, level, feedback, lang, useMemory);
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const reply = await callProvider(provider, apiKey, model, newMessages, sysPrompt);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setError((e as Error).message ?? c.error);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  if (!started) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
        </div>

        <div className="card" style={{ padding: "1.75rem", maxWidth: 560 }}>
          {/* Provider */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{c.provider}</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["openai", "anthropic", "gemini"] as Provider[]).map((p) => (
                <button key={p} className={provider === p ? "btn-primary" : "btn-ghost"}
                  onClick={() => switchProvider(p)}
                  style={{ flex: 1, textTransform: "capitalize" }}>
                  {p === "openai" ? "OpenAI" : p === "anthropic" ? "Claude" : "Gemini"}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{c.apiKey}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
              placeholder={c.apiKeyPlaceholder}
              style={{ width: "100%" }}
            />
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
              🔒 {c.apiKeyNote}
            </p>
            {keyFormatHint(provider, apiKey) && (
              <p style={{ fontSize: "0.8rem", color: "#e67e22", marginTop: "0.25rem" }}>
                ⚠ {keyFormatHint(provider, apiKey)}
              </p>
            )}
          </div>

          {/* Model */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{c.model}</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.9rem", borderRadius: 8,
                border: "1.5px solid var(--border)", fontFamily: "inherit", fontSize: "0.92rem" }}>
              {MODELS[provider].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Topic */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{c.topic}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {Object.entries(c.topics).map(([key, label]) => (
                <button key={key} className={topic === key ? "btn-primary" : "btn-ghost"}
                  style={{ fontSize: "0.88rem" }} onClick={() => setTopic(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{c.levelLabel}</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(Object.entries(c.levels) as [Level, string][]).map(([k, v]) => (
                <button key={k} className={level === k ? "btn-primary" : "btn-ghost"}
                  style={{ flex: 1 }} onClick={() => setLevel(k)}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <button
              onClick={() => setFeedback((f) => !f)}
              style={{
                width: 44, height: 24, borderRadius: 12, padding: 0,
                background: feedback ? "var(--blue)" : "var(--border)",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3, left: feedback ? 22 : 3, transition: "left 0.2s",
              }} />
            </button>
            <span style={{ fontSize: "0.92rem" }}>{c.feedbackToggle}</span>
          </div>

          {/* Memory toggle */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1.5rem",
            padding: "0.85rem 1rem", borderRadius: 10,
            background: useMemory ? "var(--blue-light)" : "var(--bg)",
            border: `1.5px solid ${useMemory ? "var(--blue)" : "var(--border)"}`,
            transition: "background 0.2s, border-color 0.2s",
          }}>
            <button
              onClick={() => setUseMemory((m) => !m)}
              style={{
                width: 44, height: 24, borderRadius: 12, padding: 0, flexShrink: 0,
                background: useMemory ? "var(--blue)" : "var(--border)",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3, left: useMemory ? 22 : 3, transition: "left 0.2s",
              }} />
            </button>
            <div>
              <div style={{ fontSize: "0.92rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                📊 {c.memoryToggle}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                {c.memoryNote}
              </div>
              {useMemory && (() => {
                const ctx = readProgressContext();
                return ctx.masteredCount > 0 || ctx.learningCount > 0 ? (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                    <span className="badge badge-green" style={{ marginRight: "0.4rem" }}>
                      ✓ {ctx.masteredCount} {c.memoryMastered}
                    </span>
                    <span className="badge badge-yellow">
                      ⟳ {ctx.learningCount} {c.memoryLearning}
                    </span>
                  </div>
                ) : (
                  <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {c.memoryEmpty}
                  </div>
                );
              })()}
            </div>
          </div>

          {error && <p style={{ color: "#c0392b", marginBottom: "0.75rem", fontSize: "0.9rem" }}>{error}</p>}

          <button className="btn-primary" onClick={startChat} style={{ width: "100%", padding: "0.75rem" }}>
            ▶ {c.start}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", padding: 0 }}>
      {/* Chat header */}
      <div style={{ background: "var(--blue)", color: "#fff", padding: "0.75rem 1.25rem",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontWeight: 700 }}>{c.title}</span>
          <span style={{ opacity: 0.7, fontSize: "0.85rem", marginLeft: "0.75rem" }}>
            {(c.topics as Record<string, string>)[topic]} · {model}
            {useMemory && (() => {
              const ctx = readProgressContext();
              return ctx.masteredCount > 0
                ? <span style={{ marginLeft: "0.5rem", opacity: 0.9 }}>· 📊 {ctx.masteredCount}✓</span>
                : null;
            })()}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-ghost" style={{ fontSize: "0.82rem", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
            onClick={() => setMessages([])}>
            {c.clear}
          </button>
          <button className="btn-ghost" style={{ fontSize: "0.82rem", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
            onClick={() => setStarted(false)}>
            ← {c.start}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "78%", padding: "0.75rem 1rem", borderRadius: 14,
              background: m.role === "user" ? "var(--blue)" : "var(--card-bg)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              border: m.role === "assistant" ? "1px solid var(--border)" : "none",
              fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap",
              borderBottomRightRadius: m.role === "user" ? 4 : 14,
              borderBottomLeftRadius: m.role === "assistant" ? 4 : 14,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div className="card" style={{ padding: "0.75rem 1rem", display: "flex", gap: "0.35rem", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: "var(--blue)",
                  animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}
        {error && <p style={{ color: "#c0392b", textAlign: "center", fontSize: "0.9rem" }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "0.75rem 1.25rem",
        background: "var(--card-bg)", display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={c.placeholder}
          rows={2}
          style={{ flex: 1, resize: "none", fontFamily: "inherit", fontSize: "0.95rem",
            border: "1.5px solid var(--border)", borderRadius: 10, padding: "0.6rem 0.9rem",
            outline: "none", lineHeight: 1.5 }}
        />
        <button className="btn-primary" onClick={send} disabled={loading || !input.trim()}
          style={{ padding: "0.65rem 1.25rem", opacity: loading || !input.trim() ? 0.5 : 1 }}>
          {c.send} ↑
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
