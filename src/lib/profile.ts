import type { ProfileInput, PublicUser } from "@/backend/types";
import { collectHashtags } from "@/lib/hashtags";

export function aliasError(alias: string, users: Pick<PublicUser, "id" | "alias">[], selfId?: string): string | null {
  const value = alias.trim();
  if (!value) return "Pick an alias.";
  if (!/^[A-Za-z][A-Za-z0-9]{2,17}$/.test(value)) {
    return "Use 3–18 letters or numbers, starting with a letter.";
  }
  const taken = users.some(
    (user) => user.id !== selfId && user.alias.toLowerCase() === value.toLowerCase(),
  );
  if (taken) return "That alias is already taken.";
  return null;
}

export function bioError(bio: string): string | null {
  const value = bio.trim();
  if (!value) return "Add a quote about yourself.";
  if (value.length > 80) return "Keep the quote to one line, 80 characters.";
  return null;
}

export function profileError(
  input: ProfileInput,
  users: Pick<PublicUser, "id" | "alias">[],
  selfId?: string,
): string | null {
  const tags = collectHashtags(input.hashtags, { min: 0, max: 8 });
  return aliasError(input.alias, users, selfId) ?? bioError(input.bioQuote) ?? tags.error;
}

/** Whether the You form has a valid change waiting to be saved. A quote-only edit counts. */
export function profileDraftStatus(input: {
  alias: string;
  bio: string;
  tags: string[];
  saved: Pick<PublicUser, "alias" | "bioQuote" | "hashtags">;
  users: Pick<PublicUser, "id" | "alias">[];
  selfId: string;
}): { dirty: boolean; error: string | null; canSave: boolean } {
  const error = profileError(
    { alias: input.alias, bioQuote: input.bio, hashtags: input.tags },
    input.users,
    input.selfId,
  );
  const sameTags = input.tags.join("|") === input.saved.hashtags.join("|");
  const dirty =
    input.alias.trim() !== input.saved.alias || input.bio.trim() !== input.saved.bioQuote || !sameTags;
  return { dirty, error, canSave: dirty && error == null };
}

export function cleanedProfileHashtags(raw: string[]): string[] {
  return collectHashtags(raw, { min: 0, max: 8 }).tags;
}
