import { useSyncExternalStore } from "react";

let now = Date.now();
const listeners = new Set<() => void>();
let timer: number | null = null;

function ensureClock() {
  if (timer != null || typeof window === "undefined") return;
  now = Date.now();
  timer = window.setInterval(() => {
    now = Date.now();
    for (const listener of listeners) listener();
  }, 5000);
}

function subscribe(listener: () => void) {
  ensureClock();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNow() {
  return useSyncExternalStore(subscribe, () => now, () => Date.now());
}
