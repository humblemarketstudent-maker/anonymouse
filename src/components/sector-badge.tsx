import type { Sector } from "@/backend/types";
import { Badge } from "@/components/ui/badge";

export function SectorBadge({ sector }: { sector: Sector }) {
  return (
    <Badge variant="outline" className="h-5 border-primary/30 bg-primary/10 px-2 text-[10px] tracking-wide text-primary">
      {sector}
    </Badge>
  );
}
