import { type Translations } from "../i18n";
import { useProgress } from "../hooks/useProgress";
import nounsRaw from "../data/nouns.json";
import verbsRaw from "../data/verbs.json";

interface Props { tr: Translations }

const TOTAL_NOUNS = nounsRaw.length;
const TOTAL_VERBS = verbsRaw.length;

function Ring({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const pct = max === 0 ? 0 : Math.min(value / max, 1);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.5s" }}
        />
        <text x={50} y={50} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 18, fontWeight: 700, fill: color }}
        >
          {value}
        </text>
      </svg>
      <div style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

export default function Progress({ tr }: Props) {
  const p = tr.progress;
  const { progress, reset, getStatus } = useProgress();

  const nounStats = {
    mastered: nounsRaw.filter((n) => getStatus(n.id) === "mastered").length,
    learning: nounsRaw.filter((n) => getStatus(n.id) === "learning").length,
  };
  const verbStats = {
    mastered: verbsRaw.filter((v) => getStatus(v.id) === "mastered").length,
    learning: verbsRaw.filter((v) => getStatus(v.id) === "learning").length,
  };
  const total = TOTAL_NOUNS + TOTAL_VERBS;
  const totalMastered = nounStats.mastered + verbStats.mastered;
  const totalLearning = nounStats.learning + verbStats.learning;

  function handleReset() {
    if (window.confirm(p.resetConfirm)) reset();
  }

  const recentItems = Object.entries(progress)
    .filter(([, s]) => s !== "notStarted")
    .slice(-20)
    .reverse();

  return (
    <div className="page">
      <div className="page-header">
        <h1>{p.title}</h1>
        <p>{p.subtitle}</p>
      </div>

      {/* Summary rings */}
      <div className="card" style={{ padding: "1.75rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "1.5rem" }}>
          <Ring value={totalMastered} max={total} color="var(--blue)" label={p.mastered} />
          <Ring value={totalLearning} max={total} color="#e6a800" label={p.learning} />
          <Ring value={total - totalMastered - totalLearning} max={total} color="#ccc" label={p.notStarted} />
        </div>
        <div style={{ textAlign: "center", marginTop: "1.25rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {p.totalWords}: {total}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        {[
          { label: p.nouns, total: TOTAL_NOUNS, ...nounStats },
          { label: p.verbs, total: TOTAL_VERBS, ...verbStats },
        ].map(({ label, total: t, mastered, learning }) => (
          <div key={label} className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.75rem", color: "var(--blue)" }}>{label}</div>
            <div style={{ background: "var(--border)", borderRadius: 6, height: 8, marginBottom: "0.5rem", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 6,
                background: `linear-gradient(90deg, var(--blue) ${(mastered / t) * 100}%, #e6a800 ${(mastered / t) * 100}% ${((mastered + learning) / t) * 100}%, transparent ${((mastered + learning) / t) * 100}%)`,
                transition: "width 0.5s",
              }} />
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <span className="badge badge-green" style={{ marginRight: "0.4rem" }}>{mastered}</span>
              <span className="badge badge-yellow" style={{ marginRight: "0.4rem" }}>{learning}</span>
              / {t}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      {recentItems.length > 0 && (
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
          <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Recent activity</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {recentItems.map(([id, status]) => (
              <span key={id} className={`badge ${status === "mastered" ? "badge-green" : "badge-yellow"}`}>
                {id.split("_")[0]}
              </span>
            ))}
          </div>
        </div>
      )}

      <button className="btn-ghost" onClick={handleReset} style={{ color: "#c0392b", borderColor: "#c0392b" }}>
        🗑 {p.reset}
      </button>
    </div>
  );
}
