import { useState } from "react";
import { type Lang, t } from "../i18n";

export function useLang() {
  const valid: Lang[] = ["zh", "en", "fr", "de"];
  const raw = localStorage.getItem("lang") ?? "zh";
  const stored = (valid.includes(raw as Lang) ? raw : "zh") as Lang;
  const [lang, setLangState] = useState<Lang>(stored);

  function setLang(l: Lang) {
    localStorage.setItem("lang", l);
    setLangState(l);
  }

  return { lang, setLang, tr: t[lang] };
}
