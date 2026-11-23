import { useContext } from "react";
import { ModerationContext } from "@/components/moderation";

export function useModeration() {
  const value = useContext(ModerationContext);
  if (!value) throw new Error("useModeration must be used inside the floor");
  return value;
}
