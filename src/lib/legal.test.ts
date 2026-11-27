import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENTS, PRIVACY_POLICY, TERMS_OF_SERVICE, legalPlainText } from "@/lib/legal";

const text = legalPlainText();

describe("combined terms and privacy", () => {
  it("keeps the Hong Kong structure and the short-notice duties", () => {
    expect(TERMS_OF_SERVICE.path).toBe("/terms");
    expect(PRIVACY_POLICY.path).toBe("/privacy");
    expect(text).toMatch(/Control of Exemption Clauses Ordinance \(Cap\. 71\)/);
    expect(text).toMatch(/HK\$1,000 or the total fees you paid us in the preceding twelve \(12\) months, whichever is greater/);
    expect(text).toMatch(/indemnify and hold harmless Anonymouse and the people who operate the service/);
    expect(text).toMatch(/Anonymouse and the people who operate the service are not liable/);
    expect(text).toMatch(/courts of Hong Kong have exclusive jurisdiction/);
    expect(text).toMatch(/Personal Data \(Privacy\) Ordinance \(Cap\. 486\)/);
    expect(text).toMatch(/within 40 calendar days/);
    expect(text).toMatch(/reasonable, non-excessive fee/);
    expect(text).toMatch(/Part 6A of the PDPO/);
    expect(text).toMatch(/direct marketing/);
    expect(text).toMatch(/send it from the email address you use to sign in/);
    expect(text).toMatch(/does not publish a separate contact address/);
    expect(text).toMatch(/A report that exists only on a device is not notice to us/);
    expect(text).toMatch(/responsible for how you use Anonymouse/);
    expect(text).toMatch(/does not pre-screen all messages/);
    expect(text).toMatch(/offered as it is/);
    expect(text).toMatch(/not a license to break the law/);
    expect(text).toMatch(/used only to sign you back in on this device/);
    expect(text).toMatch(/not shown on a profile, in a room, or in a message/);
    expect(text).toMatch(/illegal, abusive, or harmful/);
    expect(text).toMatch(/at least 13/);
    expect(text).toMatch(/does not give up a right the law says cannot be given up/);
    expect(text).toMatch(/Cap\. 390/);
    expect(text).toMatch(/Cap\. 200/);
    expect(text).toMatch(/Cap\. 106/);
    expect(text).toMatch(/Cap\. 528/);
    expect(LEGAL_DOCUMENTS).toHaveLength(2);
  });

  it("describes the current email and on-device chat design", () => {
    expect(text).toMatch(/Twilio Verify/);
    expect(text).toMatch(/SendGrid/);
    expect(text).toMatch(/noreply@anonymouse\.lol/);
    expect(text).toMatch(/does not currently receive or retain that message content on its servers/);
    expect(text).toMatch(/held in memory only/);
    expect(text).toMatch(/served over TLS/);
    expect(text).toMatch(/send it from the email address you use to sign in/);
    expect(text).toMatch(/outside Hong Kong/);
    expect(text).toMatch(/does not name a server region/);
    expect(text).toMatch(/about 3 days/);
  });

  it("does not add claims the product does not make", () => {
    expect(text).not.toMatch(/Wellhive|anonymouse\.app|Prototype only|Nothing here is advice|lawyer|legal opinion/i);
    expect(text).not.toMatch(/\[Company Name Limited\]|\[Registered Hong Kong Business Address\]|incorporated in Hong Kong|abuse@|privacy@|Data Protection Officer/);
    expect(text).toMatch(/We do not ask for a cryptographic proof or a session key/);
    expect(text).toMatch(/We do not collect push-notification tokens/);
    expect(text).toMatch(/does not claim cryptographic hashing as the way the email address is stored/);
    expect(text).not.toMatch(/end-to-end encrypted by Anonymouse servers/i);
    expect(text).not.toMatch(/\b(7|14|30)[- ]day/i);
    expect(text).not.toMatch(/Singapore|Option A/);
  });
});
