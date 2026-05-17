import { type Translations } from "../i18n";

interface Props { tr: Translations }

const GITHUB_BASE = "https://github.com/oranju/swedish-handbook/blob/main/handbook";

export default function Handbook({ tr }: Props) {
  const h = tr.handbook;
  return (
    <div className="page">
      <div className="page-header">
        <h1>{h.title}</h1>
        <p>{h.subtitle}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {h.chapters.map((ch) => (
          <a
            key={ch.num}
            href={`${GITHUB_BASE}/chapter${ch.num}.md`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <div className="card" style={{
              padding: "1.25rem 1.5rem",
              display: "flex", alignItems: "center", gap: "1rem",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,106,167,0.18)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                (e.currentTarget as HTMLDivElement).style.transform = "";
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "var(--blue)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem", fontWeight: 700, flexShrink: 0,
              }}>
                {ch.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--blue)", fontSize: "1.05rem" }}>
                  {ch.zh}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{ch.en}</div>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>↗</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
