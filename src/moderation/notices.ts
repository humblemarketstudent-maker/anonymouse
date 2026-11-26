/** User-facing copy. It names the outcome and does not describe internal rules. */
export const NOTICE = {
  pii: "Personal details were masked.",
  blocked: "That message was blocked before it could be posted.",
  attachmentBlocked: "That attachment was blocked before it could be posted.",
  held: "That attachment is held for review and was not posted.",
  paused: "Sending is paused for a little while.",
} as const;
