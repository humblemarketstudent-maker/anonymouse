/**
 * Product notice shown on the shared sign-in and registration screen.
 * The value stored on this device is `DISCLAIMER_VERSION` only.
 */
export const DISCLAIMER_STORAGE_KEY = "anonymouse.disclaimer.accepted";

export const DISCLAIMER_VERSION = "2026-11-27";

export const DISCLAIMER_SECTIONS = [
  {
    heading: "Your responsibility",
    body: "You are responsible for how you use Anonymouse and for the content you send. Use the service only in ways that are lawful for you.",
  },
  {
    heading: "Messages from other people",
    body: "The service does not pre-screen all messages. Other people write their own. To the extent the law allows, Anonymouse is not liable for other users' content, or for interruption, delay, or unavailability. The service is offered as it is. These limits stop where the law does not allow them.",
  },
  {
    heading: "Anonymity and email",
    body: "Anonymity here is not absolute, and it is not a license to break the law. Your email is used only to sign you back in on this device. It is not shown on a profile, in a room, or in a message.",
  },
  {
    heading: "Prohibited use",
    body: "Do not use Anonymouse for illegal, abusive, or harmful purposes. That includes sexual content involving minors, threats, harassment, scams, spam, impersonation, publishing someone else's private information without a right to do so, malware, and trying to disrupt the service.",
  },
  {
    heading: "Age",
    body: "You must be old enough to use Anonymouse lawfully where you live. Messaging services commonly require users to be at least 13. If the law where you live sets a higher age, or requires a parent or guardian to agree for you, that rule applies.",
  },
  {
    heading: "Governing law",
    body: "The service is operated from Hong Kong. This notice does not name a company or other legal entity. It does not give up any right the law says cannot be given up. Where the law allows a choice of governing law for a dispute, the laws of Hong Kong apply.",
  },
] as const;

export type DisclaimerStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function disclaimerPlainText(
  sections: readonly { heading: string; body: string }[] = DISCLAIMER_SECTIONS,
): string {
  return sections.map((section) => `${section.heading}\n${section.body}`).join("\n\n");
}

function browserStorage(): DisclaimerStorage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readDisclaimerAcceptance(storage: DisclaimerStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(DISCLAIMER_STORAGE_KEY) === DISCLAIMER_VERSION;
  } catch {
    return false;
  }
}

export function writeDisclaimerAcceptance(
  accepted: boolean,
  storage: DisclaimerStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    if (accepted) storage.setItem(DISCLAIMER_STORAGE_KEY, DISCLAIMER_VERSION);
    else storage.removeItem(DISCLAIMER_STORAGE_KEY);
  } catch {
    /* Private mode and quota failures still leave the in-page checkbox in effect. */
  }
}
