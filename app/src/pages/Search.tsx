import { useState, useMemo } from "react";
import { type Translations } from "../i18n";
import SpeakButton from "../components/SpeakButton";
import nounsRaw from "../data/nouns.json";
import verbsRaw from "../data/verbs.json";
import searchIndex from "../data/search_index.json";

interface Props { tr: Translations }

interface Result {
  type: "noun" | "verb" | "text";
  chapter?: number;
  heading?: string;
  primary: string;
  secondary: string;
  tag?: string;
}

function highlight(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
}

export default function Search({ tr }: Props) {
  const s = tr.search;
  const [query, setQuery] = useState("");

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Result[] = [];

    // Search nouns
    nounsRaw.forEach((n) => {
      const haystack = `${n.indefinite_sg} ${n.definite_sg} ${n.zh} ${n.en} ${n.indefinite_pl}`.toLowerCase();
      if (haystack.includes(q)) {
        out.push({
          type: "noun",
          primary: n.indefinite_sg,
          secondary: `${n.zh}  ·  ${n.en}  |  定式: ${n.definite_sg}  |  复数: ${n.indefinite_pl || "—"}`,
          tag: `名词 · ${n.category}`,
        });
      }
    });

    // Search verbs
    verbsRaw.forEach((v) => {
      const haystack = `${v.infinitive} ${v.present} ${v.past} ${v.supinum} ${v.zh}`.toLowerCase();
      if (haystack.includes(q)) {
        out.push({
          type: "verb",
          primary: v.infinitive,
          secondary: `${v.zh}  |  现在时: ${v.present}  ·  过去时: ${v.past}  ·  supinum: ${v.supinum}`,
          tag: `动词 · ${v.group || ""}`,
        });
      }
    });

    // Search chapter text
    searchIndex.forEach((entry) => {
      if (entry.text.toLowerCase().includes(q) || entry.heading.toLowerCase().includes(q)) {
        out.push({
          type: "text",
          chapter: entry.chapter,
          heading: entry.heading,
          primary: entry.heading,
          secondary: entry.text.slice(0, 200),
          tag: `${s.chapter} ${entry.chapter}${s.chapterSuffix}`,
        });
      }
    });

    return out.slice(0, 60);
  }, [query, s]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{s.title}</h1>
      </div>

      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <span style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem" }}>🔍</span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.placeholder}
          style={{ width: "100%", paddingLeft: "2.4rem", fontSize: "1.05rem", padding: "0.75rem 1rem 0.75rem 2.6rem" }}
        />
      </div>

      {query.length >= 2 && (
        <div style={{ marginBottom: "0.75rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {s.results}: {results.length}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && (
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
          {s.noResults}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {results.map((r, i) => (
          <div key={i} className="card" style={{ padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>
                {r.type === "noun" ? "📝" : r.type === "verb" ? "🔤" : "📖"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span
                    style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--blue)" }}
                    dangerouslySetInnerHTML={{ __html: highlight(r.primary, query) }}
                  />
                  {r.type !== "text" && <SpeakButton text={r.primary} size="sm" />}
                  {r.tag && <span className="badge" style={{ fontSize: "0.75rem" }}>{r.tag}</span>}
                </div>
                <div
                  style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: highlight(r.secondary, query) }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`mark { background: var(--yellow); border-radius: 3px; padding: 0 2px; }`}</style>
    </div>
  );
}
