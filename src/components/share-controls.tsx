import { useRef, type ReactNode } from "react";
import { Link2, Paperclip, X } from "lucide-react";
import type { ChatAttachment } from "@/backend/types";
import { FileCard } from "@/components/file-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ATTACHMENT_ACCEPT, readAttachment } from "@/lib/files";

export function AttachButton({
  onPick,
  onError,
}: {
  onPick: (file: ChatAttachment) => void;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void readAttachment(file).then((result) => {
            if (!result.ok) onError(result.error);
            else onPick(result.attachment);
          });
        }}
      />
      <Button
        type="button"
        variant="ghost"
        className="size-11 shrink-0 rounded-full"
        aria-label="Attach a file"
        onClick={() => input.current?.click()}
      >
        <Paperclip />
      </Button>
    </>
  );
}

export function LinkButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant={open ? "secondary" : "ghost"}
      className="size-11 shrink-0 rounded-full"
      aria-label={open ? "Close link" : "Share a link"}
      aria-pressed={open}
      onClick={onToggle}
    >
      <Link2 />
    </Button>
  );
}

export function SharePreview({
  linkOpen,
  url,
  onUrl,
  preview,
  attachment,
  onClearAttachment,
}: {
  linkOpen: boolean;
  url: string;
  onUrl: (value: string) => void;
  preview: ReactNode;
  attachment: ChatAttachment | null;
  onClearAttachment: () => void;
}) {
  if (!linkOpen && !attachment) return null;
  return (
    <div className="mb-2 space-y-2 px-1">
      {attachment ? (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-card/80 p-2">
          <div className="min-w-0 flex-1">
            <FileCard file={attachment} />
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Remove attachment" onClick={onClearAttachment}>
            <X />
          </Button>
        </div>
      ) : null}
      {linkOpen ? (
        <>
          <Input
            value={url}
            onChange={(event) => onUrl(event.target.value)}
            placeholder="https://"
            aria-label="Link to share"
            inputMode="url"
            className="h-11"
          />
          {preview}
        </>
      ) : null}
    </div>
  );
}
