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

// ── Voice helpers ─────────────────────────────────────────────────────────────
export function getSwedishVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "sv-SE") ??
    voices.find((v) => v.lang.startsWith("sv")) ??
    null
  );
}

export function hasSwedishVoice(): boolean {
  return getSwedishVoice() !== null;
}

function waitForVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    const timer = setTimeout(() => resolve(window.speechSynthesis.getVoices()), timeoutMs);
    window.speechSynthesis.addEventListener("voiceschanged", function handler() {
      clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    });
  });
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
async function speakBrowser(
  text: string, onStart: () => void, onEnd: () => void, onError: (msg: string) => void,
): Promise<void> {
  if (!("speechSynthesis" in window)) { onError("not-supported"); onEnd(); return; }

  window.speechSynthesis.cancel();
  await new Promise((r) => setTimeout(r, 80));

  const voices = await waitForVoices();
  const svVoice = voices.find((v) => v.lang === "sv-SE") ?? voices.find((v) => v.lang.startsWith("sv"));

  if (!svVoice) {
    // No Swedish voice — try anyway with lang tag, but warn
    onError("no-sv-voice");
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "sv-SE";
  utterance.rate = 0.9;
  if (svVoice) utterance.voice = svVoice;

  // Detect silent failure: if onstart never fires within 2s, it failed
  let started = false;
  const failTimer = setTimeout(() => {
    if (!started) { onError("silent-fail"); onEnd(); }
  }, 2000);

  utterance.onstart = () => { started = true; clearTimeout(failTimer); onStart(); };
  utterance.onend = () => { clearTimeout(failTimer); onEnd(); };
  utterance.onerror = (e) => {
    clearTimeout(failTimer);
    if (e.error !== "interrupted") onError(e.error);
    onEnd();
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
      if (!ok) await speakBrowser(text, onStart, onEnd, onError);
    } else {
      await speakBrowser(text, onStart, onEnd, onError);
    }
  }, [engine]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, speechError, engine };
}
