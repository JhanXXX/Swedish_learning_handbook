import { useSpeech } from "../hooks/useSpeech";

interface Props {
  text: string;
  size?: "sm" | "md";
}

export default function SpeakButton({ text, size = "md" }: Props) {
  const { speak, speaking } = useSpeech();
  const dim = size === "sm" ? 28 : 36;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(text); }}
      title={speaking ? "Stop" : `Pronounce: ${text}`}
      style={{
        width: dim, height: dim, borderRadius: "50%", padding: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: speaking ? "var(--blue)" : "var(--blue-light)",
        color: speaking ? "#fff" : "var(--blue)",
        border: "1.5px solid var(--blue)",
        fontSize: size === "sm" ? "0.85rem" : "1.1rem",
        flexShrink: 0, cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {speaking ? "⏹" : "🔊"}
    </button>
  );
}
