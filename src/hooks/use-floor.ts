import { useMemo, useSyncExternalStore } from "react";
import { backend } from "@/backend";
import type { PublicUser } from "@/backend/types";

export function useFloor() {
  const snap = useSyncExternalStore(backend.subscribe, backend.getSnapshot, backend.getSnapshot);
  const usersById = useMemo(() => {
    const map = new Map<string, PublicUser>();
    for (const user of snap.users) map.set(user.id, user);
    return map;
  }, [snap.users]);
  return { ...snap, usersById };
}
