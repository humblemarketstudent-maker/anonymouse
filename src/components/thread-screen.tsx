import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, Send } from "lucide-react";
import type { ChatAttachment } from "@/backend/types";
import { AttachButton, LinkButton, SharePreview } from "@/components/share-controls";
import { NewsCard } from "@/components/news-card";
import { CONTACT_BLOCKED, contactViolation } from "@/lib/contact";
import { previewFromUrl } from "@/lib/news";
import { buildOutgoing } from "@/lib/outgoing";
import { toast } from "sonner";
import { backend } from "@/backend";
import { AliasMenu } from "@/components/alias-menu";
import { ChatHeader } from "@/components/chat-header";
import { ChatTranscript } from "@/components/chat-transcript";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useFloor } from "@/hooks/use-floor";
import { useNow } from "@/hooks/use-now";

export function ThreadScreen({ threadId }: { threadId: string }) {
  const { threads, messages, me, usersById } = useFloor();
  const thread = threads.find((item) => item.id === threadId);
  const peer = thread ? usersById.get(thread.peerId) : undefined;
  const lines = messages.filter((message) => message.threadId === threadId);
  const now = useNow();
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [burnOpen, setBurnOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [pin, setPin] = useState(0);

  useEffect(() => {
    backend.setPresence({ threadId });
    backend.markThreadRead(threadId);
    return () => backend.setPresence({ threadId: null });
  }, [threadId]);

  useEffect(() => {
    backend.markThreadRead(threadId);
  }, [threadId, lines.length]);

  if (!thread || !peer || !me) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader backTo="/msg" backLabel="Back to MSG" title="Message" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">This conversation is gone.</p>
          <Button variant="outline" asChild>
            <Link to="/msg">Back to MSG</Link>
          </Button>
        </div>
      </div>
    );
  }

  const linkBlocked = linkOpen && url.trim() && contactViolation(url) ? CONTACT_BLOCKED : null;
  const linkPreview = linkOpen && url.trim() && !linkBlocked ? previewFromUrl(url, body) : null;

  function send() {
    const next = buildOutgoing({
      body,
      url,
      linkOpen,
      attachment: attachment ?? undefined,
      maxLength: 600,
      lengthError: "Keep the message under 600 characters.",
    });
    if ("error" in next) {
      setError(next.error);
      return;
    }
    const result = backend.sendMessage(threadId, next.body, { news: next.news, attachment: next.attachment });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    setUrl("");
    setAttachment(null);
    setLinkOpen(false);
    setError(null);
    setPin((value) => value + 1);
  }

  const fromMatch = thread.origin === "match";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatHeader
        backTo="/msg"
        backLabel="Back to MSG"
        title={peer.alias}
        avatar={peer.avatar}
        subtitle={fromMatch ? "Match line" : "Direct line"}
        onTitle={() => navigate(`/profile/${peer.id}`)}
        titleLabel={`${peer.alias} profile`}
        aside={
          <AliasMenu userId={peer.id} showMessage={false} label="Conversation actions">
            <DropdownMenuItem onSelect={() => navigate(`/profile/${peer.id}`)}>Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => window.setTimeout(() => setBurnOpen(true), 0)}>
              <Flame />
              Burn chat
            </DropdownMenuItem>
            {fromMatch ? (
              <DropdownMenuItem onSelect={() => window.setTimeout(() => setEndOpen(true), 0)}>
                End match
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
          </AliasMenu>
        }
      />
      <ChatTranscript
        messages={lines}
        meId={me.id}
        aliasFor={(senderId) => usersById.get(senderId)?.alias}
        showAliases={false}
        conversationId={thread.id}
        pin={pin}
        now={now}
        empty={fromMatch ? "They accepted. Say something." : "Say something. This stays between aliases."}
      />
      <form
        className="sticky bottom-0 z-20 min-w-0 shrink-0 border-t bg-background/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <SharePreview
          linkOpen={linkOpen}
          url={url}
          onUrl={(value) => {
            setUrl(value);
            if (error) setError(null);
          }}
          attachment={attachment}
          onClearAttachment={() => setAttachment(null)}
          preview={linkPreview ? <NewsCard news={linkPreview} /> : null}
        />
        <div className="flex min-w-0 items-end gap-1.5">
          <AttachButton
            onPick={(file) => {
              setAttachment(file);
              setError(null);
            }}
            onError={setError}
          />
          <LinkButton open={linkOpen} onToggle={() => setLinkOpen((open) => !open)} />
          <Textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${peer.alias}`}
            aria-label={`Message ${peer.alias}`}
            rows={1}
            maxLength={600}
            className="composer-field max-h-28 min-h-11 w-auto min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border-transparent bg-secondary px-3 py-2.5 text-base leading-5 field-sizing-fixed"
          />
          <Button type="submit" className="size-11 rounded-full" aria-label="Send">
            <Send />
          </Button>
        </div>
        {error || linkBlocked ? (
          <p role="alert" className="mt-1 px-1 text-sm leading-snug text-destructive">
            {error || linkBlocked}
          </p>
        ) : null}
      </form>
      <Dialog open={burnOpen} onOpenChange={setBurnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Burn this chat?</DialogTitle>
            <DialogDescription>
              {fromMatch
                ? `Every message with ${peer.alias} is wiped on this device, the match ends, and they stay out of Match for a while.`
                : `Every message in this line is wiped on this device. You can open a new line with ${peer.alias} later.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBurnOpen(false)}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                backend.burnThread(thread.id);
                toast("Chat burned.");
                navigate("/msg");
              }}
            >
              Burn chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this match?</DialogTitle>
            <DialogDescription>
              The conversation closes and {peer.alias} won't show up in the next Match passes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEndOpen(false)}>
              Keep talking
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const result = backend.endMatch(thread.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast("Match ended.");
                navigate("/msg");
              }}
            >
              End match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
