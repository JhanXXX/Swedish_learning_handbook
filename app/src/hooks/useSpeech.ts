import { useCallback, useEffect, useState } from "react";

// Voices load asynchronously in Chrome — cache them at module level
let _voices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const refresh = () => { _voices = window.speechSynthesis.getVoices(); };
  refresh();
  window.speechSynthesis.addEventListener("voiceschanged", refresh);
}

export function getSwedishVoice(): SpeechSynthesisVoice | null {
  const v = _voices.length > 0 ? _voices : (window.speechSynthesis?.getVoices() ?? []);
  return v.find((x) => x.lang === "sv-SE") ?? v.find((x) => x.lang.startsWith("sv")) ?? null;
}

export function hasSwedishVoice(): boolean {
  return getSwedishVoice() !== null;
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const speak = useCallback((text: string) => {
    if (!text.trim() || !("speechSynthesis" in window)) return;

    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "sv-SE";
    utterance.rate = 0.85;
    const voice = getSwedishVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = (e) => { if (e.error !== "interrupted") setSpeaking(false); };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, speaking, stop };
}
