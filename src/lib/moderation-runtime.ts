import { createJournal, type Journal } from "@/moderation/journal";
import { createRateStore, type RateStore } from "@/moderation/rate";

export interface ModerationRuntime {
  journal: Journal;
  rate: RateStore;
}

function memoryStore() {
  const bag = new Map<string, string>();
  return {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bag.set(key, value);
    },
  };
}

let shared: ModerationRuntime | null = null;

/** One journal and rate bucket for this browser tab. Tests can build their own. */
export function sharedModeration(): ModerationRuntime {
  if (!shared) {
    const storage = typeof localStorage === "undefined" ? memoryStore() : localStorage;
    shared = { journal: createJournal(storage), rate: createRateStore() };
  }
  return shared;
}
