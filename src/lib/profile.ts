import { SECTORS, type ProfileInput, type PublicUser, type Sector } from "@/backend/types";

export function isSector(value: string): value is Sector {
  return (SECTORS as readonly string[]).includes(value);
}

export function aliasError(alias: string, users: Pick<PublicUser, "id" | "alias">[], selfId?: string): string | null {
  const value = alias.trim();
  if (!value) return "Pick an alias.";
  if (!/^[A-Za-z][A-Za-z0-9]{2,17}$/.test(value)) {
    return "Use 3–18 letters or numbers, starting with a letter.";
  }
  const taken = users.some(
    (user) => user.id !== selfId && user.alias.toLowerCase() === value.toLowerCase(),
  );
  if (taken) return "That alias is already on the floor.";
  return null;
}

export function bioError(bio: string): string | null {
  const value = bio.trim();
  if (!value) return "Add a one-line quote.";
  if (value.length > 80) return "Keep the quote to one line, 80 characters.";
  return null;
}

export function profileError(
  input: ProfileInput,
  users: Pick<PublicUser, "id" | "alias">[],
  selfId?: string,
): string | null {
  return aliasError(input.alias, users, selfId) ?? bioError(input.bioQuote) ?? (isSector(input.sector) ? null : "Pick a desk.");
}
