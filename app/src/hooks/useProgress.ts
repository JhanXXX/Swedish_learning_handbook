import { useState, useCallback } from "react";

export type ItemStatus = "notStarted" | "learning" | "mastered";

const STORAGE_KEY = "sv_progress";

function load(): Record<string, ItemStatus> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save(data: Record<string, ItemStatus>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useProgress() {
  const [progress, setProgress] = useState<Record<string, ItemStatus>>(load);

  const mark = useCallback((id: string, status: ItemStatus) => {
    setProgress((prev) => {
      const next = { ...prev, [id]: status };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProgress({});
  }, []);

  const getStatus = useCallback(
    (id: string): ItemStatus => progress[id] ?? "notStarted",
    [progress]
  );

  const counts = {
    mastered: Object.values(progress).filter((s) => s === "mastered").length,
    learning: Object.values(progress).filter((s) => s === "learning").length,
    notStarted: 0,
  };

  return { progress, mark, reset, getStatus, counts };
}
