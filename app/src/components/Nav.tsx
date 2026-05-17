import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { type Lang } from "../i18n";
import { type Translations } from "../i18n";
import { type TTSEngine, changeTTSEngine, hasSwedishVoice } from "../hooks/useSpeech";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: Translations;
}

function TTSPicker() {
  const [engine, setEngine] = useState<TTSEngine>(
    () => (localStorage.getItem("sv_tts_engine") ?? "browser") as TTSEngine
  );
  const [open, setOpen] = useState(false);
  const hasOpenAIKey = !!localStorage.getItem("sv_key_openai");
  const svVoiceAvailable = hasSwedishVoice();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function select(e: TTSEngine) {
    changeTTSEngine(e);
    setEngine(e);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Pronunciation engine"
        style={{
          background: "rgba(255,255,255,0.15)", color: "#fff",
          padding: "0.3rem 0.65rem", borderRadius: 6, fontSize: "1rem",
          border: "none", cursor: "pointer",
        }}
      >
        🔊
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          border: "1px solid var(--border)", padding: "0.5rem",
          minWidth: 220, zIndex: 200,
        }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.25rem 0.5rem 0.5rem", fontWeight: 600 }}>
            PRONUNCIATION ENGINE
          </div>

          {[
            { key: "browser" as TTSEngine, label: "Browser (free)", sublabel: svVoiceAvailable ? "Swedish voice detected ✓" : "⚠ No Swedish voice — install 'Alva' in System Settings → Accessibility → Spoken Content", icon: "🌐" },
            { key: "openai" as TTSEngine, label: "OpenAI TTS", sublabel: hasOpenAIKey ? "Uses saved OpenAI key · higher quality" : "Requires OpenAI API key in AI Chat", icon: "✨" },
          ].map(({ key, label, sublabel, icon }) => (
            <button
              key={key}
              onClick={() => select(key)}
              disabled={key === "openai" && !hasOpenAIKey}
              style={{
                display: "flex", alignItems: "flex-start", gap: "0.6rem",
                width: "100%", padding: "0.6rem 0.75rem", borderRadius: 8,
                background: engine === key ? "var(--blue-light)" : "transparent",
                color: "var(--text)", border: "none", cursor: key === "openai" && !hasOpenAIKey ? "not-allowed" : "pointer",
                opacity: key === "openai" && !hasOpenAIKey ? 0.5 : 1,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {label}
                  {engine === key && <span style={{ color: "var(--blue)", fontSize: "0.75rem" }}>✓ active</span>}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{sublabel}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Nav({ lang, setLang, tr }: Props) {
  const links = [
    { to: "/", label: tr.nav.home, end: true },
    { to: "/flashcards", label: tr.nav.flashcards },
    { to: "/quiz", label: tr.nav.quiz },
    { to: "/search", label: tr.nav.search },
    { to: "/progress", label: tr.nav.progress },
    { to: "/ai-chat", label: tr.nav.aiChat },
    { to: "/handbook", label: tr.nav.handbook },
  ];

  return (
    <nav className="nav">
      <span className="nav-brand">🇸🇪 {tr.appTitle}</span>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          {l.label}
        </NavLink>
      ))}
      <TTSPicker />
      <button className="lang-btn" onClick={() => {
        const cycle: Lang[] = ["zh", "en", "fr", "de"];
        const next = cycle[(cycle.indexOf(lang) + 1) % cycle.length];
        setLang(next);
      }}>
        {{ zh: "EN", en: "FR", fr: "DE", de: "中文" }[lang]}
      </button>
    </nav>
  );
}
