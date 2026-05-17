import { useState, useMemo, useCallback } from "react";
import { type Translations } from "../i18n";
import { useProgress } from "../hooks/useProgress";
import SpeakButton from "../components/SpeakButton";
import nounsRaw from "../data/nouns.json";
import verbsRaw from "../data/verbs.json";
import pronounsRaw from "../data/pronouns.json";

interface Props { tr: Translations }

type DeckType = "nouns" | "verbs" | "pronouns";

interface Card {
  id: string;
  front: string;
  zh: string;
  en: string;
  fr: string;
  de: string;
  forms: { label: string; value: string }[];
  hint?: string;
  category?: string;
}

function buildNounCards(nouns: typeof nounsRaw): Card[] {
  return nouns.map((n) => ({
    id: n.id,
    front: n.indefinite_sg,
    zh: n.zh,
    en: n.en,
    fr: (n as Record<string, string>).fr ?? "",
    de: (n as Record<string, string>).de ?? "",
    forms: [
      { label: "定式", value: n.definite_sg || "—" },
      { label: "复数", value: n.indefinite_pl || "—" },
      { label: "复数定式", value: n.definite_pl || "—" },
    ],
    category: n.category,
    hint: n.genus,
  }));
}

function buildVerbCards(verbs: typeof verbsRaw): Card[] {
  return verbs
    .filter((v) => v.zh)
    .map((v) => ({
      id: v.id,
      front: v.infinitive,
      zh: v.zh,
      en: "",
      fr: (v as Record<string, string>).fr ?? "",
      de: (v as Record<string, string>).de ?? "",
      forms: [
        { label: "现在时", value: v.present || "—" },
        { label: "过去时", value: v.past || "—" },
        { label: "supinum", value: v.supinum || "—" },
        ...(v.group ? [{ label: "组别", value: v.group }] : []),
      ],
      category: v.category,
      hint: v.group,
    }));
}

function buildPronounCards(pronouns: typeof pronounsRaw): Card[] {
  return pronouns.map((p, i) => ({
    id: `pron_${i}`,
    front: p.sv,
    zh: p.zh,
    en: p.en,
    fr: "",
    de: "",
    forms: [],
  }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type TranslationLang = "zh" | "en" | "fr" | "de";
const TRANSLATION_LANGS: { key: TranslationLang; label: string; flag: string }[] = [
  { key: "zh", label: "中文", flag: "🇨🇳" },
  { key: "en", label: "English", flag: "🇬🇧" },
  { key: "fr", label: "Français", flag: "🇫🇷" },
  { key: "de", label: "Deutsch", flag: "🇩🇪" },
];
const TRANS_PREF_KEY = "sv_card_langs";

function loadTransLangs(): TranslationLang[] {
  try {
    const stored = JSON.parse(localStorage.getItem(TRANS_PREF_KEY) ?? "null");
    if (Array.isArray(stored) && stored.length > 0) return stored;
  } catch {}
  return ["zh", "en"];
}

export default function Flashcards({ tr }: Props) {
  const f = tr.flashcards;
  const { mark, getStatus } = useProgress();

  const [deckType, setDeckType] = useState<DeckType>("nouns");
  const [category, setCategory] = useState("all");
  const [flipped, setFlipped] = useState(false);
  const [idx, setIdx] = useState(0);
  const [queue, setQueue] = useState<Card[]>([]);
  const [started, setStarted] = useState(false);
  const [transLangs, setTransLangs] = useState<TranslationLang[]>(loadTransLangs);

  function toggleTransLang(lang: TranslationLang) {
    setTransLangs((prev) => {
      const next = prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : [...prev, lang];
      const safe = next.length === 0 ? ["en" as TranslationLang] : next; // always keep at least one
      localStorage.setItem(TRANS_PREF_KEY, JSON.stringify(safe));
      return safe;
    });
  }

  const allCards = useMemo<Card[]>(() => {
    if (deckType === "nouns") return buildNounCards(nounsRaw as typeof nounsRaw);
    if (deckType === "verbs") return buildVerbCards(verbsRaw as typeof verbsRaw);
    return buildPronounCards(pronounsRaw as typeof pronounsRaw);
  }, [deckType]);

  const categories = useMemo(() => {
    const cats = [...new Set(allCards.map((c) => c.category).filter(Boolean))];
    return cats as string[];
  }, [allCards]);

  const filtered = useMemo(
    () => category === "all" ? allCards : allCards.filter((c) => c.category === category),
    [allCards, category]
  );

  function startDeck() {
    setQueue(shuffle(filtered));
    setIdx(0);
    setFlipped(false);
    setStarted(true);
  }

  const current = queue[idx];

  const handleAnswer = useCallback((correct: boolean) => {
    if (!current) return;
    mark(current.id, correct ? "mastered" : "learning");
    setFlipped(false);
    setTimeout(() => setIdx((i) => i + 1), 200);
  }, [current, mark]);

  if (!started) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>{f.title}</h1>
          <p>{f.subtitle}</p>
        </div>
        <div className="card" style={{ padding: "1.75rem", maxWidth: 520 }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{f.deck}</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(["nouns", "verbs", "pronouns"] as DeckType[]).map((d) => (
                <button key={d}
                  className={deckType === d ? "btn-primary" : "btn-ghost"}
                  onClick={() => { setDeckType(d); setCategory("all"); }}
                >
                  {f[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Translation language selector */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
              {f.showTranslations}
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {TRANSLATION_LANGS.map(({ key, label, flag }) => {
                const active = transLangs.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleTransLang(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.4rem",
                      padding: "0.4rem 0.9rem", borderRadius: 8, fontSize: "0.92rem",
                      background: active ? "var(--blue)" : "transparent",
                      color: active ? "#fff" : "var(--text-muted)",
                      border: `1.5px solid ${active ? "var(--blue)" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <span>{flag}</span> {label}
                    {active && <span style={{ fontSize: "0.75rem" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {categories.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{f.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.9rem", borderRadius: 8,
                  border: "1.5px solid var(--border)", fontFamily: "inherit", fontSize: "0.92rem" }}
              >
                <option value="all">{f.all} ({allCards.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c} ({allCards.filter(x => x.category === c).length})</option>
                ))}
              </select>
            </div>
          )}

          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: "1.25rem" }}>
            {filtered.length} cards
          </p>
          <button className="btn-primary" onClick={startDeck} style={{ width: "100%", padding: "0.75rem" }}>
            ▶ {f.deck} ({filtered.length})
          </button>
        </div>
      </div>
    );
  }

  if (idx >= queue.length) {
    const masteredCount = queue.filter((c) => getStatus(c.id) === "mastered").length;
    return (
      <div className="page" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ color: "var(--blue)", marginBottom: "0.5rem" }}>{f.done}</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}>{f.doneDesc}</p>
        <p style={{ marginBottom: "1.5rem" }}>
          <span className="badge badge-green">{f.correct}: {masteredCount}</span>{" "}
          <span className="badge">{f.wrong}: {queue.length - masteredCount}</span>
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button className="btn-primary" onClick={startDeck}>{f.restart}</button>
          <button className="btn-ghost" onClick={() => setStarted(false)}>{f.reset}</button>
        </div>
      </div>
    );
  }

  const status = getStatus(current.id);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{f.title}</h1>
        <p>{f.remaining}: {queue.length - idx} / {queue.length}</p>
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--border)", borderRadius: 8, height: 6, marginBottom: "1.5rem" }}>
        <div style={{
          background: "var(--blue)", height: "100%", borderRadius: 8,
          width: `${(idx / queue.length) * 100}%`, transition: "width 0.3s",
        }} />
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((prev) => !prev)}
        style={{
          cursor: "pointer", userSelect: "none", perspective: 800,
          maxWidth: 560, margin: "0 auto 1.5rem",
        }}
      >
        <div style={{
          minHeight: 240, borderRadius: 16, padding: "1.75rem 2rem",
          background: flipped ? "var(--blue)" : "var(--card-bg)",
          color: flipped ? "#fff" : "var(--text)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
          border: "1.5px solid var(--border)",
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          textAlign: "center", transition: "background 0.25s, color 0.25s",
          position: "relative",
        }}>
          {/* Speak button */}
          <div style={{ position: "absolute", top: "0.85rem", right: "0.85rem" }}
            onClick={(e) => e.stopPropagation()}>
            <SpeakButton text={current.front} size="sm" />
          </div>

          <div style={{ fontSize: "0.78rem", opacity: 0.55, marginBottom: "0.65rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {flipped ? f.back : f.front}
          </div>

          {!flipped ? (
            /* ── FRONT: Swedish word ── */
            <>
              <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1.3 }}>
                {current.front}
              </div>
              {current.hint && (
                <span className="badge" style={{ marginTop: "0.75rem", opacity: 0.85 }}>{current.hint}</span>
              )}
              <div style={{ marginTop: "1rem", fontSize: "0.8rem", opacity: 0.45 }}>{f.flip} ↕</div>
            </>
          ) : (
            /* ── BACK: meanings + forms ── */
            <div style={{ width: "100%" }}>
              {/* Chinese meaning — prominent */}
              {current.zh && transLangs.includes("zh") && (
                <div style={{ fontSize: "1.7rem", fontWeight: 800, marginBottom: "0.3rem", color: "var(--yellow)" }}>
                  {current.zh}
                </div>
              )}
              {/* Secondary translations */}
              {[
                { key: "en" as TranslationLang, value: current.en, flag: "🇬🇧" },
                { key: "fr" as TranslationLang, value: current.fr, flag: "🇫🇷" },
                { key: "de" as TranslationLang, value: current.de, flag: "🇩🇪" },
              ].filter(({ key, value }) => value && transLangs.includes(key)).map(({ flag, value }) => (
                <div key={flag} style={{ fontSize: "1.05rem", opacity: 0.85, marginBottom: "0.25rem" }}>
                  {flag} {value}
                </div>
              ))}
              {/* Spacing before forms */}
              {[current.en, current.fr, current.de].some((v, idx) =>
                v && transLangs.includes(["en","fr","de"][idx] as TranslationLang)
              ) && <div style={{ marginBottom: "0.75rem" }} />}
              {/* Grammatical forms — small chips */}
              {current.forms.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
                  {current.forms.map((form) => (
                    <div key={form.label} style={{
                      background: "rgba(255,255,255,0.15)", borderRadius: 6,
                      padding: "0.2rem 0.6rem", fontSize: "0.82rem",
                    }}>
                      <span style={{ opacity: 0.7 }}>{form.label}: </span>
                      <span style={{ fontWeight: 600 }}>{form.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status badge */}
      {status !== "notStarted" && (
        <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
          <span className={`badge ${status === "mastered" ? "badge-green" : "badge-yellow"}`}>
            {status === "mastered" ? f.correct : f.wrong}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", maxWidth: 560, margin: "0 auto" }}>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={() => handleAnswer(false)}>
          ✗ {f.wrong}
        </button>
        <button className="btn-yellow" style={{ flex: 1 }} onClick={() => handleAnswer(true)}>
          ✓ {f.correct}
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
        <button className="btn-ghost" style={{ fontSize: "0.85rem" }} onClick={() => setStarted(false)}>
          ← {f.reset}
        </button>
      </div>
    </div>
  );
}
