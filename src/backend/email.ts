/**
 * Sign-in email. The normalized value may live on the private account
 * contact field. It must not be copied onto a public profile.
 */

const EMAIL =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export const EMAIL_INVALID = "Enter an email address. It never appears on your profile.";
export const EMAIL_ONLY = "Use an email address. Phone sign-in isn't available.";

/** Lowercase address, or null when this is not an email we can sign in with. */
export function normalizeEmail(contact: string): string | null {
  const trimmed = contact.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254) return null;
  if (trimmed.includes("..") || /\s/.test(trimmed)) return null;
  if (!EMAIL.test(trimmed)) return null;
  return trimmed;
}

export function emailSignInError(contact: string): string {
  const trimmed = contact.trim();
  if (trimmed && !trimmed.includes("@")) return EMAIL_ONLY;
  return EMAIL_INVALID;
}
