import { toast } from "sonner";
import { backend } from "@/backend";

export function openLine(peerId: string): string | null {
  const result = backend.openThread(peerId);
  if (!result.ok) {
    toast.error(result.error);
    return null;
  }
  return result.threadId;
}
