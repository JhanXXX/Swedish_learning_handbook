import { useState } from "react";
import { useSpeech } from "../hooks/useSpeech";

interface Props {
  text: string;
  size?: "sm" | "md";
}

const ERROR_TIPS: Record<string, string> = {
  "no-sv-voice": "No Swedish voice installed. Go to System Settings → Accessibility → Spoken Content → System Voice to install 'Alva' (Swedish).",
  "silent-fail": "Speech failed silently. Please install a Swedish voice in your OS settings.",
  "not-supported": "Your browser does not support speech synthesis.",
  "no-key": "No OpenAI key found. Enter it in AI Chat first.",
};

export default function SpeakButton({ text, size = "md" }: Props) {
  const { speak, speaking, speechError } = useSpeech();
  const [showTip, setShowTip] = useState(false);

  const dim = size === "sm" ? 28 : 36;
  const fontSize = size === "sm" ? "0.85rem" : "1.1rem";
  const hasError = !!speechError;
  const tip = speechError ? (ERROR_TIPS[speechError] ?? `Error: ${speechError}`) : null;

  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowTip(false);
          speak(text);
        }}
        onMouseLeave={() => !hasError && setShowTip(false)}
        title={tip ?? `Pronounce: ${text}`}
        style={{
          width: dim, height: dim, borderRadius: "50%", padding: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: hasError ? "#fdecea" : speaking ? "var(--blue)" : "var(--blue-light)",
          color: hasError ? "#c0392b" : speaking ? "#fff" : "var(--blue)",
          border: `1.5px solid ${hasError ? "#c0392b" : "var(--blue)"}`,
          fontSize, flexShrink: 0,
          transition: "background 0.15s, color 0.15s",
          cursor: "pointer",
        }}
      >
        {hasError ? "⚠" : speaking ? "⏹" : "🔊"}
      </button>

      {/* Error tooltip */}
      {hasError && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowTip((s) => !s); }}
          style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: "50%", padding: 0,
            background: "#c0392b", color: "#fff", fontSize: "0.6rem",
            border: "none", cursor: "pointer", lineHeight: 1,
          }}
        >?</button>
      )}
      {showTip && tip && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#2d2d2d", color: "#fff", fontSize: "0.78rem",
          padding: "0.5rem 0.75rem", borderRadius: 8, width: 220,
          lineHeight: 1.4, zIndex: 300, whiteSpace: "normal", textAlign: "left",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}>
          {tip}
        </div>
      )}
    </div>
  );
}
