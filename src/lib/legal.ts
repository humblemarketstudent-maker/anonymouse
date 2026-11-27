/**
 * Terms of Service and Privacy Policy shown before an email code is sent.
 * Working draft product language. The on-device marker is a version string.
 */

export const LEGAL_UPDATED = "27 November 2026";

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  path: "/terms" | "/privacy";
  kicker: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}

const nonWaivable =
  "Nothing in these documents gives up a right the law says cannot be given up.";

export const TERMS_OF_SERVICE: LegalDocument = {
  path: "/terms",
  kicker: "Part 1",
  title: "Terms of Service and limitation of liability",
  updated: LEGAL_UPDATED,
  sections: [
    {
      heading: "1. Nature of the service",
      blocks: [
        {
          kind: "p",
          text: 'Anonymouse ("the Platform," "we," "us," or "our"), operated by [Company Name Limited], a company incorporated in Hong Kong, is the service at anonymouse.lol. [Company Name Limited] and [Registered Hong Kong Business Address] are placeholders for the operator\'s registered details. These Terms of Service, together with the Privacy Policy and Personal Information Collection Statement, are the rules for using the Platform.',
        },
        {
          kind: "p",
          text: "You are responsible for how you use Anonymouse and for the content you send. Use the service only in ways that are lawful for you.",
        },
        {
          kind: "p",
          text: "Rooms, direct messages (MSG), and Match currently keep chat and profile data on your device, in browser storage on that device. Anonymouse does not currently receive or retain that message content on its servers. There is no shared message backend for those features. We do not initiate those on-device messages, select their recipients, or pre-screen, edit, endorse, or exercise editorial control over them before they appear on the device. The service does not pre-screen all messages. Other people write their own.",
        },
        {
          kind: "p",
          text: 'For User Content that is actually within our possession or control, we act as a passive technical conduit and subordinate distributor. "User Content" means material you create, transmit, store, or share through the Platform. We do not monitor or store private on-device chats.',
        },
        {
          kind: "p",
          text: "If server-side messaging or public channels that pass through our systems are added later, messages in those features would be processed to deliver the communication and to enforce these Terms. That is not how private rooms, MSG, or Match work today.",
        },
        {
          kind: "p",
          text: "Anonymity on Anonymouse is not absolute, and it is not a license to break the law. Your email address is used only to sign you back in on this device. It is not shown on a profile, in a room, or in a message.",
        },
        {
          kind: "p",
          text: "The service is offered as it is and as available. Limits on liability for other people's content, and for interruption, delay, or unavailability, stop where the law does not allow them.",
        },
        { kind: "p", text: nonWaivable },
      ],
    },
    {
      heading: "2. Your obligations and prohibited conduct",
      blocks: [
        {
          kind: "p",
          text: "You are solely responsible for User Content you create, transmit, store on your device, or share on Anonymouse. You agree not to use the Platform for illegal, abusive, or harmful purposes, and not to transmit, store, or distribute content that violates the laws of the Hong Kong Special Administrative Region, including:",
        },
        {
          kind: "list",
          items: [
            "Doxxing and privacy violations. Unauthorized disclosure of personal data with intent to cause specified harm, or with reckless disregard, contrary to the Personal Data (Privacy) Ordinance (Cap. 486), including publishing someone else's private information without a right to do so.",
            "Defamation and harassment. Malicious falsehoods, defamatory statements, threats, persistent harassment or intimidation, and impersonation.",
            "Obscene and indecent material. Content prohibited under the Control of Obscene and Indecent Articles Ordinance (Cap. 390), child sexual abuse material, other sexual content involving minors, and non-consensual intimate imagery prohibited under the Crimes Ordinance (Cap. 200).",
            "National security and public order. Content that incites violence or sedition, or that constitutes an offence under the Hong Kong National Security Law or the Safeguarding National Security Ordinance.",
            "Fraud and cybercrime. Phishing, financial scams, spam, malware, attempts to break or overload the service, unauthorized access to computer systems under the Telecommunications Ordinance (Cap. 106) or the Crimes Ordinance (Cap. 200), and intellectual property infringement under the Copyright Ordinance (Cap. 528).",
          ],
        },
        {
          kind: "p",
          text: "Age. You must be old enough to use Anonymouse lawfully where you live. Messaging services commonly require users to be at least 13. If the law where you live sets a higher age, or requires a parent or guardian to agree for you, that rule applies.",
        },
      ],
    },
    {
      heading: "3. Notice-and-takedown",
      blocks: [
        {
          kind: "p",
          text: "We do not proactively monitor private on-device communications, and we do not currently store them. Where Hong Kong law treats a passive intermediary as an innocent disseminator, that status depends on how we act once we have actual notice of unlawful content that is within our possession or control.",
        },
        {
          kind: "p",
          text: "Upon actual notice or knowledge of unlawful User Content that we hold or control, including in a space we operate, we will take expeditious steps to remove or disable access to that content to the extent we can. We may also refuse further sign-in codes or end access to the extent the product can do that. We cannot delete a chat that exists only on someone else's device and was never provided to us.",
        },
        {
          kind: "p",
          text: "Reports of unlawful content, copyright infringement, or doxxing may be sent to abuse@anonymouse.lol. Include enough detail to identify content that is within our possession or control. A report filed inside the app is stored on that device. It reaches us only if you also send it to that address or we otherwise come into possession of it.",
        },
      ],
    },
    {
      heading: "4. Disclaimer of warranties",
      blocks: [
        {
          kind: "p",
          text: 'TO THE FULLEST EXTENT PERMITTED BY HONG KONG LAW, INCLUDING THE CONTROL OF EXEMPTION CLAUSES ORDINANCE (CAP. 71), ANONYMOUSE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, ERROR-FREE, OR COMPLETELY IMMUNE TO UNAUTHORIZED ACCESS OR DE-ANONYMIZATION. WE DO NOT WARRANT THAT MATERIAL STORED ONLY ON YOUR DEVICE WILL REMAIN AVAILABLE AFTER THE BROWSER DATA IS CLEARED, THE DEVICE IS LOST, OR THE APP DROPS EXPIRED MESSAGES.',
        },
        {
          kind: "p",
          text: "These limits stop where the law does not allow them. They do not give up any right the law says cannot be given up.",
        },
      ],
    },
    {
      heading: "5. Limitation of liability and indemnification",
      blocks: [
        {
          kind: "p",
          text: "Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any other liability that cannot be excluded or limited under the laws of Hong Kong, including the Control of Exemption Clauses Ordinance (Cap. 71).",
        },
        {
          kind: "p",
          text: "Subject to that, [Company Name Limited], its directors, officers, and employees are not liable for indirect, consequential, or special loss, loss of profit, or damage arising from third-party defamatory, offensive, or unlawful User Content, or from interruption, delay, or unavailability of the service. To the maximum extent permitted by law, our total aggregate liability arising out of or in connection with the Platform or these Terms shall not exceed HK$1,000 or the total fees you paid us in the preceding twelve (12) months, whichever is greater.",
        },
        {
          kind: "p",
          text: "You agree to indemnify and hold harmless [Company Name Limited], its directors, officers, and employees from and against claims, liabilities, damages, losses, and legal costs (on a full indemnity basis) arising out of your breach of these Terms, your violation of Hong Kong law, your User Content, or your infringement of a third party's rights, to the extent Hong Kong law allows that indemnity. The indemnity does not require you to cover a liability the law says cannot be shifted.",
        },
      ],
    },
    {
      heading: "6. Personal data and law enforcement requests",
      blocks: [
        {
          kind: "p",
          text: "We handle personal data as described in the Privacy Policy and Personal Information Collection Statement, and in line with the Personal Data (Privacy) Ordinance (Cap. 486). The Platform is built to collect little data.",
        },
        {
          kind: "p",
          text: "Where we are served with a valid court order, warrant, or statutory notice issued by a competent Hong Kong court or authority, including the Privacy Commissioner for Personal Data or the Hong Kong Police Force, we will comply to the extent Hong Kong law requires and only to the extent the data exists in our possession or control. Chats that never left your device are not in our possession.",
        },
      ],
    },
    {
      heading: "7. Governing law and disputes",
      blocks: [
        {
          kind: "p",
          text: "These Terms, and any dispute or claim arising out of or in connection with them (including non-contractual disputes or claims), are governed by the laws of the Hong Kong Special Administrative Region. The parties irrevocably agree that the courts of Hong Kong have exclusive jurisdiction to settle any dispute or claim arising out of these Terms, where the law allows that choice of court.",
        },
        {
          kind: "p",
          text: "This section does not give up a right the law says cannot be given up, including a mandatory right to bring a claim somewhere else.",
        },
      ],
    },
    {
      heading: "8. Changes",
      blocks: [
        {
          kind: "p",
          text: "We may update these Terms. The date above is the version published in the app. If the version you agreed to on this device is no longer current, you will be asked to read and agree again before another sign-in code is sent. The marker stored on the device is a version string. It is not your email address.",
        },
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  path: "/privacy",
  kicker: "Part 2",
  title: "Privacy Policy and Personal Information Collection Statement",
  updated: LEGAL_UPDATED,
  sections: [
    {
      heading: "1. What we collect (DPP 1)",
      blocks: [
        {
          kind: "p",
          text: '[Company Name Limited] ("we," "us," or "our"), operator of Anonymouse at anonymouse.lol, publishes this statement under the Personal Data (Privacy) Ordinance (Cap. 486) ("PDPO"). It is our Personal Information Collection Statement for the data described below. [Registered Hong Kong Business Address] is a placeholder for the registered office. We do not ask for your real name, residential address, or Hong Kong Identity Card number.',
        },
        {
          kind: "p",
          text: "Email address. If you ask for a one-time sign-in code, we collect the email address you enter so the code can be sent and checked. The auth service passes that address to Twilio Verify on the email channel. The message is sent with SendGrid from noreply@anonymouse.lol. Our auth process does not keep the code, and it does not keep a database of email addresses. The short-lived sign-in token does not contain the email address, and the browser does not keep that token. After the code is accepted, the address is saved in browser storage on that device so you can sign back in there. It is not shown on a profile, in a room, or in a message. The address itself is sent to those processors. We do not describe the sign-in record as a hash in place of the address.",
        },
        {
          kind: "p",
          text: "Sign-in limits. The auth service applies rate limits using the normalized email address and the client IP address seen on the request. Those counters are held in memory only. The counter store does not keep the email address in plain text. Restarting the auth process clears the counters. We do not keep a separate server log of email addresses or IP addresses for a fixed period.",
        },
        {
          kind: "p",
          text: "Rooms, MSG, Match, and profiles. Your alias, quote, hashtags, avatar, room lines, direct messages, Match activity, friends list, and in-app reports are stored on your device. Anonymouse does not currently receive or retain that content on its servers. Those features are not end-to-end encrypted by Anonymouse, because the messages are not routed through Anonymouse servers. On the device, room lines and direct messages are removed after about 3 days. That deletion happens in the app on the device. Clearing the site data in the browser removes the on-device copy, including the saved email address.",
        },
        {
          kind: "p",
          text: "Later server-side features. If we add messaging or public channels that our servers handle, those messages would be processed to deliver the communication and to enforce the Terms of Service. That sentence describes a possible later feature. It does not describe current private rooms, MSG, or Match.",
        },
        {
          kind: "p",
          text: "What this product does not collect. We do not collect push-notification tokens, and we do not collect diagnostic logs, device operating-system details, or app-version analytics as a product feature. An email address is required in order to send a one-time code. Other profile details are what you choose to enter on the device. If the browser cannot reach the site or the auth service, sign-in cannot finish.",
        },
        {
          kind: "p",
          text: "Correspondence. If you write to abuse@anonymouse.lol or privacy@anonymouse.lol, we receive the message you send, including your email address and whatever you include in it.",
        },
      ],
    },
    {
      heading: "2. Purposes of use (DPP 1 and DPP 3)",
      blocks: [
        {
          kind: "p",
          text: "We use personal data for these purposes, or a purpose directly related to them:",
        },
        {
          kind: "list",
          items: [
            "Sending and checking the one-time sign-in code, and signing you back in on that device.",
            "Applying the in-memory limits that reduce repeated or automated code requests.",
            "Reading and answering mail sent to abuse@anonymouse.lol or privacy@anonymouse.lol.",
            "Complying with a valid Hong Kong court order, warrant, or statutory notice, limited to data in our possession or control.",
          ],
        },
        {
          kind: "p",
          text: "Delivering messages through our servers is not a current purpose of collection for rooms, MSG, or Match, because that content stays on the device. If a later feature sends messages through our servers, those messages would be used to deliver them and to enforce the Terms.",
        },
        {
          kind: "p",
          text: "We will not use your personal data for a new purpose, including direct marketing, without your express, voluntary, prescribed consent under Part 6A of the PDPO. The sign-in email is not used for direct marketing.",
        },
      ],
    },
    {
      heading: "3. How long data is kept (DPP 2)",
      blocks: [
        {
          kind: "p",
          text: "Personal data is kept only as long as needed for the purpose for which it was collected.",
        },
        {
          kind: "list",
          items: [
            "Our auth process does not store the one-time code. Twilio Verify holds the code for the check.",
            "Our auth process does not keep the email address after it has passed the address to Twilio Verify for that request. Twilio Verify and SendGrid handle the address on their systems in order to send and check the code.",
            "In-memory anti-abuse counters last only while they are inside the short limit window, and they are discarded when the auth process restarts. There is no timed server archive of those counters.",
            "The email address, profile, and chats in browser storage remain on that device until the app drops expired messages, you remove them, or you clear the site data. We do not hold a server copy of those chats.",
            "Mail sent to abuse@anonymouse.lol or privacy@anonymouse.lol is kept only as long as needed to deal with that message and any legal duty that applies to it. The product does not put that mail in a separate database with its own retention clock.",
          ],
        },
        {
          kind: "p",
          text: "We do not run a relay that queues undelivered private messages on Anonymouse servers.",
        },
      ],
    },
    {
      heading: "4. Disclosure and transfers (DPP 1 and DPP 3)",
      blocks: [
        {
          kind: "p",
          text: "We do not sell, rent, or trade personal data. We disclose it only in the cases below.",
        },
        {
          kind: "list",
          items: [
            "Twilio Verify and SendGrid process the email address to send and check the one-time code from noreply@anonymouse.lol. They may process that data outside Hong Kong.",
            "The website and the auth service are hosted by third-party cloud providers. The deployment files for this product use Render. This policy does not name a server region, because none is fixed in those files. Hosting and email delivery may involve processing outside Hong Kong.",
            "The Hong Kong Police Force, the Office of the Privacy Commissioner for Personal Data, or the Hong Kong courts, where a binding court order, search warrant, or statutory notice under Hong Kong law requires disclosure, and only for data actually in our possession or control.",
          ],
        },
        {
          kind: "p",
          text: "Where personal data is processed outside Hong Kong, the transfer is limited to the providers and purposes named here. We rely on the safeguards that apply to those providers, including their contracts and security measures, so the data is protected to a standard comparable to the PDPO. We do not claim that every server sits in one named city.",
        },
      ],
    },
    {
      heading: "5. Security (DPP 4)",
      blocks: [
        {
          kind: "p",
          text: "The live site at https://anonymouse.lol and the auth API are served over TLS. Auth responses are sent with instructions not to store them in a shared cache. The sign-in token does not include the email address.",
        },
        {
          kind: "p",
          text: "This policy does not claim cryptographic hashing as the way the email address is stored, role-based access audits, or a programme of external security audits. No internet transmission is completely immune to interception. Anonymity is not absolute. You are responsible for the device you use and for anyone who can open its browser storage.",
        },
      ],
    },
    {
      heading: "6. Access and correction (DPP 6)",
      blocks: [
        {
          kind: "p",
          text: "Under the PDPO you may ask whether we hold personal data about you and ask for a copy (a data access request). You may ask us to correct personal data we hold that is inaccurate (a data correction request).",
        },
        {
          kind: "p",
          text: "Email privacy@anonymouse.lol from the email address you use to sign in, and say whether you want access, correction, or both. We use that address to match the request to the sign-in address passed to the code processor. We do not ask for a cryptographic proof or a session key. We may ask you to show that you can still read mail at that address before we reply with personal data. Because rooms, MSG, and Match stay on your device, we may hold little or none of that content. We cannot return chats that were never sent to us. You can remove the on-device copy by clearing the site data in your browser.",
        },
        {
          kind: "p",
          text: "We will answer a valid request within 40 calendar days. We may charge a reasonable, non-excessive fee for complying with a data access request, as the PDPO allows.",
        },
      ],
    },
    {
      heading: "7. Data Protection Officer (DPP 5)",
      blocks: [
        {
          kind: "p",
          text: "Questions about this statement, and data access or correction requests, go to:",
        },
        {
          kind: "list",
          items: [
            "Title: Data Protection Officer",
            "Company: [Company Name Limited]",
            "Address: [Registered Hong Kong Business Address]",
            "Email: privacy@anonymouse.lol",
          ],
        },
        {
          kind: "p",
          text: "Notices about unlawful content may be sent to abuse@anonymouse.lol. This statement does not give up a right the PDPO says cannot be given up.",
        },
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = [TERMS_OF_SERVICE, PRIVACY_POLICY] as const;

export function legalPlainText(documents: readonly LegalDocument[] = LEGAL_DOCUMENTS): string {
  return documents
    .map((document) => {
      const sections = document.sections
        .map((section) => {
          const body = section.blocks
            .map((block) => (block.kind === "p" ? block.text : block.items.join("\n")))
            .join("\n\n");
          return `${section.heading}\n${body}`;
        })
        .join("\n\n");
      return `${document.title}\nLast updated: ${document.updated}\n\n${sections}`;
    })
    .join("\n\n");
}
