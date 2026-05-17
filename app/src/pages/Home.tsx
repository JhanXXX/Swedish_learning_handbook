import { Link } from "react-router-dom";
import { type Translations } from "../i18n";

interface Props { tr: Translations }

const routes = ["/flashcards", "/quiz", "/search", "/progress", "/ai-chat", "/handbook"];

export default function Home({ tr }: Props) {
  return (
    <div className="page">
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🇸🇪</div>
        <h1 style={{ fontSize: "2.2rem", color: "var(--blue)", marginBottom: "0.5rem" }}>
          {tr.home.welcome}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", maxWidth: 560, margin: "0 auto" }}>
          {tr.home.subtitle}
        </p>
      </div>

      {/* Feature grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1rem",
        marginBottom: "2.5rem",
      }}>
        {tr.home.features.map((f, i) => (
          <Link key={i} to={routes[i]} style={{ textDecoration: "none" }}>
            <div className="card" style={{
              padding: "1.4rem",
              cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
              display: "flex", gap: "1rem", alignItems: "flex-start",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,106,167,0.18)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                (e.currentTarget as HTMLDivElement).style.transform = "";
              }}
            >
              <span style={{ fontSize: "2rem" }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--blue)", marginBottom: "0.25rem" }}>
                  {f.title}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{f.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Chapter list */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", color: "var(--blue)", marginBottom: "1rem" }}>
          📖 {tr.nav.handbook}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
          {tr.home.chapters.map((ch, i) => (
            <Link key={i} to={`/handbook`} style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.55rem 0.9rem", borderRadius: 8,
              background: "var(--blue-light)", color: "var(--blue)",
              fontWeight: 500, fontSize: "0.92rem",
            }}>
              <span style={{
                background: "var(--blue)", color: "#fff",
                borderRadius: "50%", width: 22, height: 22,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.78rem", fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</span>
              {ch}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
