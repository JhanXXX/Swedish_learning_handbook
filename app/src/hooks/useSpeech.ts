import { useCallback, useEffect, useRef, useState } from "react";

export type TTSEngine = "browser" | "openai";

const TTS_ENGINE_KEY = "sv_tts_engine";
const audioCache = new Map<string, string>();

export function getTTSEngine(): TTSEngine {
  return (localStorage.getItem(TTS_ENGINE_KEY) ?? "browser") as TTSEngine;
}

export function changeTTSEngine(engine: TTSEngine) {
  localStorage.setItem(TTS_ENGINE_KEY, engine);
  window.dispatchEvent(new Event("tts-engine-changed"));
}

// ── Eager voice cache — populated at module load so first click is instant ────
let _voices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const refreshVoices = () => { _voices = window.speechSynthesis.getVoices(); };
  refreshVoices();
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}

export function getSwedishVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = _voices.length > 0 ? _voices : window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "sv-SE") ?? voices.find((v) => v.lang.startsWith("sv")) ?? null;
}

export function hasSwedishVoice(): boolean {
  return getSwedishVoice() !== null;
}

// ── OpenAI TTS ────────────────────────────────────────────────────────────────
async function speakOpenAI(
  text: string, onStart: () => void, onEnd: () => void, onError: (msg: string) => void,
): Promise<boolean> {
  const apiKey = localStorage.getItem("sv_key_openai") ?? "";
  if (!apiKey) { onError("no-key"); return false; }
  onStart();
  try {
    let url = audioCache.get(text);
    if (!url) {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "tts-1", voice: "nova", input: text, speed: 0.9 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      url = URL.createObjectURL(await res.blob());
      audioCache.set(text, url);
    }
    const audio = new Audio(url);
    audio.onended = onEnd;
    audio.onerror = () => { onError("playback"); onEnd(); };
    await audio.play();
    return true;
  } catch (e) {
    onError((e as Error).message ?? "unknown");
    onEnd();
    return false;
  }
}

// ── Browser TTS ───────────────────────────────────────────────────────────────
function speakBrowser(
  text: string, onStart: () => void, onEnd: () => void, onError: (msg: string) => void,
): void {
  if (!("speechSynthesis" in window)) { onError("not-supported"); onEnd(); return; }

  window.speechSynthesis.cancel();

  const svVoice = getSwedishVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "sv-SE";
  utterance.rate = 0.9;
  if (svVoice) utterance.voice = svVoice;

  // Give immediate visual feedback — don't make user wait for onstart
  onStart();

  // Guard against onEnd being called twice (failTimer + utterance.onend race)
  let ended = false;
  const safeEnd = () => { if (!ended) { ended = true; onEnd(); } };

  // If onstart never fires within 4s the browser silently dropped the utterance
  const failTimer = setTimeout(() => {
    safeEnd();
    onError(svVoice ? "silent-fail" : "no-sv-voice");
  }, 4000);

  utterance.onstart = () => { clearTimeout(failTimer); };
  utterance.onend = () => { clearTimeout(failTimer); safeEnd(); };
  utterance.onerror = (e) => {
    clearTimeout(failTimer);
    safeEnd();
    if (e.error !== "interrupted") onError(e.error);
  };

  window.speechSynthesis.speak(utterance);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [engine, setEngineState] = useState<TTSEngine>(getTTSEngine);
  const setSpeakingRef = useRef(setSpeaking);
  setSpeakingRef.current = setSpeaking;

  useEffect(() => {
    const handler = () => setEngineState(getTTSEngine());
    window.addEventListener("tts-engine-changed", handler);
    return () => {
      window.removeEventListener("tts-engine-changed", handler);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setSpeechError(null);
    const onStart = () => setSpeakingRef.current(true);
    const onEnd   = () => setSpeakingRef.current(false);
    const onError = (msg: string) => setSpeechError(msg);

    if (engine === "openai") {
      const ok = await speakOpenAI(text, onStart, onEnd, onError);
      if (!ok) speakBrowser(text, onStart, onEnd, onError);
    } else {
      speakBrowser(text, onStart, onEnd, onError);
    }
  }, [engine]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, speechError, engine };
}
