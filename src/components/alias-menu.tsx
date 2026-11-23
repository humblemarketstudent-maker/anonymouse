import { Flag, MoreHorizontal, UserMinus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backend } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFloor } from "@/hooks/use-floor";
import { openLine } from "@/lib/open-line";
import { useModeration } from "@/hooks/use-moderation";

export function AliasMenu({ userId, chatterId }: { userId: string; chatterId?: string }) {
  const { me, friendIds } = useFloor();
  const moderation = useModeration();
  const navigate = useNavigate();
  if (!me || userId === me.id) return null;
  const friend = friendIds.includes(userId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Alias actions"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem
          onSelect={() => {
            const threadId = openLine(userId);
            if (threadId) navigate(`/inbox/${threadId}`);
          }}
        >
          Message
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (friend) {
              backend.removeFriend(userId);
              toast("Removed from your list");
              return;
            }
            const result = backend.addFriend(userId);
            if (!result.ok) toast.error(result.error);
            else toast("Added to your list");
          }}
        >
          {friend ? <UserMinus /> : <UserPlus />}
          {friend ? "Remove friend" : "Add friend"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {chatterId ? (
          <DropdownMenuItem
            onSelect={() => window.setTimeout(() => moderation.reportChatter(chatterId, userId), 0)}
          >
            <Flag />
            Report chatter
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => window.setTimeout(() => moderation.reportUser(userId), 0)}>
          <Flag />
          Report alias
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => window.setTimeout(() => moderation.confirmBlock(userId), 0)}
        >
          Block alias
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
