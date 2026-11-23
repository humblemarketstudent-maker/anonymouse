import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import { useFloor } from "@/hooks/use-floor";

export function FlashRelay() {
  const { flashes, announcement } = useFloor();
  const navigate = useNavigate();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    for (const flash of flashes) {
      if (seen.current.has(flash.id)) continue;
      seen.current.add(flash.id);
      toast(flash.title, {
        description: flash.body,
        action: flash.threadId
          ? {
              label: "Open",
              onClick: () => navigate(`/inbox/${flash.threadId}`),
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
