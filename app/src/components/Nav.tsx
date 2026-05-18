import { NavLink } from "react-router-dom";
import { type Lang, type Translations } from "../i18n";
import CarrotIcon from "./CarrotIcon";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: Translations;
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
      <span className="nav-brand">
        <CarrotIcon size={22} />
        <span>🇸🇪 {tr.appTitle}</span>
      </span>
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
