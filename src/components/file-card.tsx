import { FileText } from "lucide-react";
import type { ChatAttachment } from "@/backend/types";
import { formatBytes, isImageMime } from "@/lib/files";

export function FileCard({ file }: { file: ChatAttachment }) {
  if (isImageMime(file.mime)) {
    return (
      <a href={file.dataUrl} download={file.name} className="mt-1.5 block max-w-full">
        <img src={file.dataUrl} alt={file.name} className="max-h-52 max-w-full rounded-lg object-cover" />
      </a>
    );
  }
  return (
    <a
      href={file.dataUrl}
      download={file.name}
      className="mt-1.5 flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-2 text-foreground"
    >
      <FileText className="size-4 shrink-0 text-primary" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
      </span>
    </a>
  );
}
