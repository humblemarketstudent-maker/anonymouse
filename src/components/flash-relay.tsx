import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import { useFloor } from "@/hooks/use-floor";
import { threadPath } from "@/lib/open-line";

export function FlashRelay() {
  const { flashes, announcement } = useFloor();
  const navigate = useNavigate();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    for (const flash of flashes) {
      if (seen.current.has(flash.id)) continue;
      seen.current.add(flash.id);
      const threadId = flash.threadId;
      toast(flash.title, {
        description: flash.body,
        action: threadId
          ? {
              label: "Open",
              onClick: () => navigate(threadPath(threadId)),
            }
          : flash.match
            ? {
                label: "Match",
                onClick: () => navigate("/match"),
              }
            : undefined,
      });
      backend.ackFlash(flash.id);
    }
  }, [flashes, navigate]);

  return (
    <div className="sr-only" aria-live="polite">
      {announcement}
    </div>
  );
}
