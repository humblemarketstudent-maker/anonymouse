import { createContext, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import { useFloor } from "@/hooks/use-floor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REASONS = [
  "Spam or solicitation",
  "Harassment",
  "Suspected manipulation",
  "Sharing a real identity",
  "Off the floor",
] as const;

interface ReportTarget {
  type: "user" | "chatter";
  id: string;
  authorId: string;
}

interface ModerationApi {
  reportUser: (userId: string) => void;
  reportChatter: (chatterId: string, authorId: string) => void;
  confirmBlock: (userId: string) => void;
}

export const ModerationContext = createContext<ModerationApi | null>(null);

export function ModerationProvider({ children }: { children: ReactNode }) {
  const { usersById, threads } = useFloor();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>(REASONS[0]);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [blockId, setBlockId] = useState<string | null>(null);

  const api: ModerationApi = {
    reportUser: (userId) => {
      setReason(REASONS[0]);
      setAlsoBlock(false);
      setReport({ type: "user", id: userId, authorId: userId });
    },
    reportChatter: (chatterId, authorId) => {
      setReason(REASONS[0]);
      setAlsoBlock(false);
      setReport({ type: "chatter", id: chatterId, authorId });
    },
    confirmBlock: (userId) => setBlockId(userId),
  };

  const reportAlias = report ? usersById.get(report.authorId)?.alias : undefined;
  const blockAlias = blockId ? usersById.get(blockId)?.alias : undefined;

  function leaveIfOpen(userId: string) {
    const thread = threads.find((item) => item.peerId === userId);
    if (thread && location.pathname.includes(thread.id)) navigate("/inbox");
  }

  return (
    <ModerationContext.Provider value={api}>
      {children}
      <Dialog open={report !== null} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {reportAlias ?? "this alias"}</DialogTitle>
            <DialogDescription>
              A confirmation is enough in this preview. Nothing is sent to a moderator.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5" role="radiogroup" aria-label="Reason">
            {REASONS.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={reason === item}
                onClick={() => setReason(item)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  reason === item ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={alsoBlock} onCheckedChange={(checked) => setAlsoBlock(checked === true)} />
            Also block this alias
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReport(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!report) return;
                backend.report({ targetType: report.type, targetId: report.id, reason });
                if (alsoBlock) {
                  backend.blockUser(report.authorId);
                  leaveIfOpen(report.authorId);
                }
                setReport(null);
                toast.success("Report filed. Thanks for keeping the floor clean.");
              }}
            >
              File report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={blockId !== null} onOpenChange={(open) => !open && setBlockId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {blockAlias ?? "this alias"}?</DialogTitle>
            <DialogDescription>
              Their chatters leave your feed and the line goes dead. You can unblock them from your desk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBlockId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!blockId) return;
                backend.blockUser(blockId);
                leaveIfOpen(blockId);
                setBlockId(null);
                toast("Alias blocked.");
              }}
            >
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModerationContext.Provider>
  );
}
