# MISSION: MUKURU TRUSTSHIELD
## Challenge C — Scam Shield
## Hackathon production mission
## Repository: mukuru-trustshield
## Deployment target: Netlify

You are the Principal Product Engineer, UX Engineer, Security Engineer,
QA Engineer and Release Engineer responsible for building and deploying
a complete hackathon prototype called:

MUKURU TRUSTSHIELD

Tagline:
“Trust before transfer.”

Supporting feature:
MUKURUPROOF

Tagline:
“Verify once. Prove anywhere.”

If `ATOM_EXECUTION_OS_v1.1.md` exists in this repository, read it
COMPLETELY before beginning and execute this mission under ATOM.

If ATOM is not present, execute this specification autonomously anyway.

Do not ask ordinary engineering questions.

Make reasonable technical decisions yourself.

Your responsibility is:

UNDERSTAND
→ ARCHITECT
→ BUILD
→ TEST
→ RED TEAM
→ FIX
→ COMMIT
→ PUSH
→ DEPLOY TO NETLIFY
→ LIVE SMOKE TEST
→ REPORT

Do not stop after generating code.

The final outcome must be a WORKING, DEPLOYED RESPONSIVE WEB APPLICATION.

============================================================
1. HACKATHON CONTEXT
============================================================

We are solving:

CHALLENGE C — SCAM SHIELD

Customer persona:
Blessing has just arrived in a new city and is looking for work.

Threats include:

- fake job offers;
- “verify your account” phishing;
- romance scams;
- fake Mukuru representatives;
- fraudulent links;
- fake payment / collection points;
- impersonation;
- requests for PINs or OTPs;
- fake fees to release money;
- malicious messages;
- suspicious new payment recipients.

The challenge requires the product to:

1. Detect suspicious messages or transactions and flag risk.
2. Analyse an incoming message or transaction pattern for red flags.
3. Show a clear warning.
4. Explain WHY it looks risky.
5. Tell the user what to do next.

Bonus expectations include:

- paste-a-message scam checker;
- risk verdict;
- plain-language reasons;
- unusual transaction detection;
- scam education;
- multiple languages.

============================================================
2. JUDGING RUBRIC
============================================================

Optimise engineering effort according to the actual scoring:

FUNCTIONALITY — 40%

The application must work end-to-end.

CREATIVITY & UX — 25%

The solution must feel original, extremely simple and appropriate
for Mukuru customers.

TECHNICAL IMPLEMENTATION — 25%

The backend, parsing, scam logic, data model, security, persistence,
tests and architecture must be credible.

PRESENTATION & TEAMWORK — 10%

The product must be easy to demonstrate in 5–7 minutes.

Do not optimise for feature count.

Optimise for:

WORKING CORE
+
BEAUTIFUL UX
+
CLEAR DIFFERENTIATOR
+
TECHNICAL CREDIBILITY
+
MEMORABLE DEMO

============================================================
3. CORE PRODUCT
============================================================

The primary product is:

“IS THIS REALLY MUKURU?”

It must operate as a STANDALONE TRUST CHECKER.

It should be architected so that Mukuru could later plug it into:

- Mukuru App;
- WhatsApp;
- website;
- payment flow;
- customer-support tooling;
- USSD-backed flows;
- fraud operations;
- partner systems.

The customer enters ANYTHING that contacted them into ONE input box.

The input may be:

- phone number;
- URL;
- link;
- email;
- pickup point;
- branch;
- physical address;
- entire SMS;
- WhatsApp message;
- social-media message;
- job offer;
- payment request;
- arbitrary text.

The user must NOT need to know what input type it is.

TrustShield detects that automatically.

============================================================
4. PRIMARY USER FLOW
============================================================

Home screen:

Mukuru logo / Mukuru-style header

Language:
English | Português | Shona

Headline:

“Is this really Mukuru?”

Supporting text:

“Paste the number, link, message or location that contacted you.
We’ll help you check it before you act.”

ONE large input box.

Supporting functionality icons beneath it:

Phone
Link
Location
Message

These are hints, not separate forms.

Primary CTA:

CHECK IT

The interface must work comfortably on a cheap Android phone.

Minimum target:
320px width.

============================================================
5. THREE VERDICTS
============================================================

There are EXACTLY three top-level user verdicts.

----------------------------------------
A. OFFICIAL MUKURU
----------------------------------------

Large positive card.

Icon:
ShieldCheck

Text:

“Official Mukuru”

Supporting reason, e.g.:

“This number matches Mukuru’s official South African contact.”

or

“This web address belongs to Mukuru.”

or

“This location matches a Mukuru location in our verified demo list.”

Always display a safety reminder:

“Mukuru will never ask you to share your PIN or OTP.”

Do NOT say:

“100% safe.”

A legitimate contact can still be copied or manipulated.

The verdict means:

THIS IDENTITY / CONTACT MATCHES OUR OFFICIAL RECORD.

----------------------------------------
B. NOT OFFICIAL
----------------------------------------

Large danger card.

Icon:
ShieldX / OctagonAlert

Text:

“Not official — stop.”

Plain next step:

“Don’t click, reply, send money or travel there.”

Show the exact reason.

Examples:

“The web address is not mukuru.com.”

“The phone number does not match an official Mukuru contact.”

“This message asks for your PIN.”

“This message asks for a fee before money can be released.”

“This location is on the reported-warning list.”

Actions:

[ REPORT THIS ]
[ CHECK SOMETHING ELSE ]

----------------------------------------
C. CAN’T CONFIRM
----------------------------------------

Large amber / neutral card.

Icon:
CircleHelp

Text:

“Can’t confirm”

Explanation:

“We couldn’t confidently match what you entered.”

Next step:

“Check the digits, copy the full link, or add the street name and town.”

Then:

“Don’t act on it until you confirm it through Mukuru’s official channels.”

Provide a safe official-contact shortcut.

IMPORTANT:

When evidence is merely absent, prefer:

CAN’T CONFIRM

over:

NOT OFFICIAL.

Avoid false alarms.

The hackathon specifically emphasises avoiding “crying wolf”.

============================================================
6. CURRENT OFFICIAL MUKURU SEED DATA
============================================================

Create a typed registry:

src/data/officialRegistry.ts

Seed it with current public Mukuru South Africa information.

Official customer domain:

mukuru.com

Official host registry should initially include:

mukuru.com
www.mukuru.com

Do NOT automatically trust every lookalike or every arbitrary hostname.

Official South African call contact:

0860018555

Canonical international representation:

+27860018555

Official WhatsApp:

+27860018555

Official support email:

support@mukuru.com

Official USSD:

*130*567#

Official source pages:

https://www.mukuru.com/sa/
https://www.mukuru.com/sa/help-support/
https://www.mukuru.com/sa/fraud-prevention/
https://www.mukuru.com/sa/find-us/

Include metadata:

{
  value,
  type,
  country,
  source,
  verifiedAt,
  demoStatus
}

Official location data:

If internet/browser capability is available, obtain 5–10 CURRENT
Mukuru branches/booths from Mukuru’s own official Find Us pages.

Store their:

- official name;
- address;
- town/city;
- type;
- source URL.

Do NOT scrape Google Maps as the authority.

Mukuru is the authority.

If official location records cannot be programmatically obtained,
create clearly labelled SIMULATED hackathon records.

Never present invented locations as current real Mukuru branches.

At minimum, Mukuru’s public Cape Town contact address may be used
from Mukuru’s official website where appropriate.

============================================================
7. URL INTELLIGENCE
============================================================

This is one of the most important technical pieces.

A scammer may use:

mukuru-login.com
mukuru-secure.co.za
mukurru.com
mukvru.com
mukuru.support.example
mukuru.com.verify-account.example
xn--mukuru-...
http://mukuru-pay.example

TrustShield must parse URLs properly.

Do NOT check whether the text merely contains the word “mukuru”.

Use the URL parser.

Extract:

- protocol;
- hostname;
- port;
- path;
- registrable domain where useful.

Canonicalise hostname:

- lowercase;
- remove safe trailing dot;
- decode/flag IDN/punycode;
- handle www explicitly.

OFFICIAL requires an exact approved host entry.

Do not mark:

mukuru.com.evil.example

as official.

Implement lookalike-domain intelligence.

Calculate a simple similarity / edit-distance signal against
approved Mukuru domains.

Examples:

mukru.com
mukurru.com
mukuru-pay.com

may receive reason:

“Looks similar to Mukuru, but this is not an official Mukuru domain.”

A near-copy is MORE suspicious than a totally unrelated domain
when the message claims to be Mukuru.

Do not fetch arbitrary URLs from the backend.

Parse only.

Avoid SSRF.

============================================================
8. PHONE NUMBER INTELLIGENCE
============================================================

Normalise phone numbers.

Support forms such as:

0860018555
0860 018 555
+27 86 001 8555
+27860018555

These must resolve to the same canonical contact.

Unknown numbers that claim to be Mukuru:

CAN’T CONFIRM

or NOT OFFICIAL depending on evidence.

An ordinary mobile number claiming:

“Hi, this is Mukuru support”

should produce a strong warning.

Do not classify every unfamiliar number globally as fraudulent.

The question is:

“Is this an official Mukuru contact?”

============================================================
9. LOCATION INTELLIGENCE
============================================================

If input looks like an address/location:

1. Normalise punctuation and spacing.
2. Match against the Mukuru official-location registry.
3. Use conservative fuzzy matching for minor spelling variation.
4. Require sufficient city/address agreement.

Example:

“Mukuru Johannesburg ABC Street…”

If matched:

OFFICIAL MUKURU

If clearly on shared scam/warning list:

NOT OFFICIAL

If no match:

CAN’T CONFIRM

Do not automatically call an unknown location fraudulent.

Show:

“Try adding the street name and town.”

============================================================
10. MESSAGE INTELLIGENCE
============================================================

If the user pastes an entire message:

Extract:

- URLs;
- phone numbers;
- email addresses where useful;
- likely Mukuru claim;
- urgent language;
- sensitive-data requests;
- upfront-fee requests;
- fake release-fee requests;
- password/PIN/OTP requests;
- account-verification requests;
- suspicious payment instructions.

Use deterministic explainable rules.

The system must NOT depend on an external LLM to function.

Create typed reason codes such as:

OFFICIAL_PHONE_MATCH
OFFICIAL_DOMAIN_MATCH
OFFICIAL_LOCATION_MATCH

UNKNOWN_PHONE
UNKNOWN_LOCATION

LOOKALIKE_DOMAIN
UNKNOWN_LINK

REQUESTS_PIN
REQUESTS_OTP
REQUESTS_PASSWORD
REQUESTS_CARD_DETAILS
REQUESTS_PERSONAL_INFORMATION

UPFRONT_FEE
RELEASE_FEE
URGENT_PAYMENT
ACCOUNT_BLOCK_THREAT
IMPERSONATION_CLAIM
UNKNOWN_LINK_IN_MUKURU_MESSAGE

REPORTED_ENTITY

Each rule has:

- code;
- severity;
- plain-language reason;
- recommended action.

Messages may combine signals.

Example:

“Your Mukuru payment is blocked.
Pay R250 now and send us your OTP:
https://mukuru-release.co.za”

should trigger:

LOOKALIKE_DOMAIN
UPFRONT_FEE
REQUESTS_OTP
ACCOUNT_BLOCK_THREAT

Verdict:

NOT OFFICIAL

Reason:

“This message asks for an OTP and payment through a web address
that is not Mukuru.”

============================================================
11. MULTILINGUAL PRODUCT
============================================================

The complete customer-facing experience must support:

1. English
2. Portuguese — preferably simple Mozambican Portuguese
3. Shona

Use:

react-i18next

or a similarly robust local dictionary system.

Do NOT rely on live translation APIs.

Translate:

- navigation;
- instructions;
- placeholders;
- buttons;
- all three verdicts;
- reason explanations;
- next steps;
- Report flow;
- MukuruProof UI;
- error messages;
- scam-learning copy.

Language selector must remain clearly visible.

Set the HTML language correctly when the language changes.

Use SIMPLE language.

Avoid financial/security jargon.

Core result concepts:

ENGLISH

Official Mukuru
Not official — stop
Can’t confirm

PORTUGUESE

Mukuru oficial
Não é oficial — pare
Não foi possível confirmar

SHONA

Mukuru yepamutemo
Haisi Mukuru yepamutemo — mira
Hatina kukwanisa kusimbisa

Translations must be reviewed for clarity.

Do not invent complex Shona financial terminology where plain
language or a commonly understood term is safer.

Message scam rules should include common suspicious keywords /
phrases in all three supported languages.

============================================================
12. ACCESSIBILITY
============================================================

The product is intended for:

- older users;
- migrants;
- first-time smartphone users;
- low-literacy users;
- low-end Android phones.

Requirements:

- large text;
- minimum 16px body text;
- high contrast;
- large tap targets;
- obvious primary action;
- minimal scrolling;
- no jargon;
- no colour-only meanings;
- icons always paired with labels;
- visible focus states;
- keyboard accessible;
- screen-reader labels;
- 320px mobile width support;
- reduced-motion support.

Result cards must be understandable at a glance.

============================================================
13. ICONOGRAPHY
============================================================

Use functional icons.

Use Lucide React or equivalent.

Examples:

ShieldCheck
ShieldX
ShieldAlert
Phone
Link2
MapPin
MessageSquareText
WalletCards
TriangleAlert
Flag
Globe2
CircleHelp
SearchCheck
QrCode
BadgeCheck

Do not use decorative icons that have no semantic meaning.

If an icon looks like a wallet, it must relate to money.

If it looks like a phone, it must relate to a phone.

If it looks like a map pin, it must relate to location.

============================================================
14. MUKURU VISUAL LANGUAGE
============================================================

The hackathon prototype should feel immediately recognisable as a
Mukuru concept.

Use Mukuru’s PUBLIC official media kit / website as the design
reference.

If internet capability exists:

- inspect mukuru.com;
- inspect Mukuru’s press/media kit;
- obtain the official logo from Mukuru’s public media kit;
- inspect current UI colours;
- derive brand tokens from the actual public brand assets/site.

Do NOT invent exact brand hex values and then claim they are official.

Create:

src/styles/brandTokens.ts

Document the source of brand values.

Visual direction:

- Mukuru orange as dominant brand accent;
- white/light surfaces;
- charcoal/black for strong text;
- friendly rounded cards;
- simple typography;
- warm, accessible fintech tone;
- strong status hierarchy;
- generous spacing;
- clean mobile-first composition.

Do NOT:

- make it look like crypto;
- make it cyberpunk;
- use hacker graphics;
- use neon gradients;
- use generic AI robot imagery;
- overuse glassmorphism;
- overload screens.

The result should look like a plausible Mukuru product extension,
not a university dashboard.

Use the official logo without altering/redrawing it if the public
media-kit asset is available and usage is appropriate for the hackathon.

Add a discreet footer:

“Hackathon prototype — not an official production Mukuru service.”

============================================================
15. HOMEPAGE UX
============================================================

Suggested structure:

[ Mukuru logo ]        [ EN | PT | SN ]

MUKURU TRUSTSHIELD

Is this really Mukuru?

Paste the number, link, message or place that contacted you.

[ LARGE MULTILINE INPUT ]

Placeholder:

“Paste a phone number, link, address or message…”

Helper row:

[Phone] Number
[Link] Link
[MapPin] Location
[Message] Message

[ CHECK IT ]

Below:

“Not sure? Try a demo.”

Demo chips:

Official Mukuru WhatsApp
Fake Mukuru link
Suspicious message
Unknown location

These seeded examples are essential for a smooth judge demo.

============================================================
16. RESULTS UX
============================================================

After checking, do not navigate through five screens.

Show a strong result sheet/card.

Example OFFICIAL:

[ShieldCheck]

OFFICIAL MUKURU

This number matches Mukuru’s official South African contact.

0860 018 555

Remember:
Mukuru will never ask for your PIN or OTP.

[ CHECK ANOTHER ]

Example NOT OFFICIAL:

[ShieldX]

NOT OFFICIAL — STOP

This website looks like Mukuru,
but it is not mukuru.com.

mukuru-secure-pay.co.za

Do not click it, reply or send money.

[ REPORT THIS ]
[ CHECK ANOTHER ]

Example CAN’T CONFIRM:

[CircleHelp]

CAN’T CONFIRM

We could not find this location in the Mukuru locations available
to this demo.

Add the street name and town, or contact Mukuru directly before
travelling there.

[ TRY AGAIN ]
[ OFFICIAL CONTACT OPTIONS ]

============================================================
17. REPORT / SHARED WARNING SYSTEM
============================================================

The Report button must WORK.

Use Netlify Blobs for hackathon persistence.

Store reports in a site-wide store:

trustshield-reports

A report should contain only necessary information:

{
  id,
  canonicalValue,
  inputType,
  reasonCodes,
  reportedAt,
  reportCount
}

Do NOT store unrelated personal text if avoidable.

Canonicalise reports.

If several users report the same canonical entity:

increment reportCount.

If a checked number/link/location has reports:

show:

“Reported by 7 TrustShield users”

BUT:

community reports are a signal.

They are not authoritative proof of fraud.

Do not let one anonymous report automatically convert something
into a definitive scam.

Use report thresholds/conservative policy.

Implement:

POST /api/report
GET /api/reports/:canonicalKey

or an equivalent well-designed interface.

============================================================
18. STANDALONE CHECKER API
============================================================

The checker itself must be a clean plug-in API.

Create:

POST /api/check

Request:

{
  "input": "...",
  "language": "en"
}

Response:

{
  "verdict": "OFFICIAL" | "NOT_OFFICIAL" | "CANT_CONFIRM",
  "inputType": "PHONE" | "URL" | "LOCATION" | "MESSAGE" | "MIXED",
  "reasonCodes": [],
  "reason": "...",
  "nextStep": "...",
  "matchedOfficialRecord": null | {...},
  "reportCount": 0,
  "checkedAt": "..."
}

Validate using Zod.

Limit input size.

Return structured errors.

The API should not be coupled to React.

Domain logic must be independently testable.

This API is the core reason TrustShield can later plug into
Mukuru App, WhatsApp or other systems.

============================================================
19. TECH STACK
============================================================

Use:

React
Vite
TypeScript strict mode
Netlify
Netlify Functions
Netlify Blobs
Zod
Vitest
React Testing Library
Playwright if practical
Lucide React
react-i18next

Use a light dependency footprint.

Potentially useful:

libphonenumber-js
fastest-levenshtein
qrcode.react

Use domain utilities rather than huge libraries where practical.

Suggested structure:

src/
  app/
  components/
  features/
    checker/
    reports/
    mukuruProof/
  domain/
    checker/
    rules/
    normalisation/
  data/
  i18n/
  styles/
  types/

netlify/
  functions/

tests/

docs/

netlify.toml

============================================================
20. MUKURUPROOF
============================================================

This is our platform differentiator.

Do NOT let it overshadow Challenge C.

It is the second demo scene.

TrustShield asks:

“Is this safe to pay?”

MukuruProof asks:

“Is it safe to pay me?”

Create a MukuruProof section.

Use a fictional customer:

Blessing Ndlovu

Use completely synthetic personal details.

Never use real customer banking information.

MukuruProof shows:

Identity                Verified
Account ownership       Verified
Account status          Active
Can receive credits     Yes
Verified at             [timestamp]
Expires                 [10 minutes]

No balance.

No transaction history.

No full statement.

No raw identity document.

[ GENERATE SECURE PROOF ]

Generate:

- short-lived opaque token;
- QR code;
- verifier URL.

Example:

/verify/<token>

The verifier page:

MUKURUPROOF

[BadgeCheck]

Verified financial details

Identity               Verified
Account owner           Verified
Account status          Active
Can receive credits     Yes

Expires in 08:42

“Only the minimum required information is shared.”

Use mock AVS / account data.

Clearly label:

SIMULATED VERIFICATION FOR HACKATHON

The architecture must nevertheless have a proper adapter interface
that real AVS or Mukuru/Bank Zero services could implement.

============================================================
21. AVS ARCHITECTURE
============================================================

AVS IS AN ADAPTER.

AVS IS NOT THE PRODUCT.

Create:

AccountVerificationProvider

interface AccountVerificationProvider {
  verifyAccount(...): Promise<AccountVerificationResult>
}

Hackathon implementation:

SimulatedAccountVerificationProvider

Future:

AVSAccountVerificationProvider
MukuruBankZeroVerificationProvider

Do not claim live AVS access.

The simulated response may contain:

{
  accountActive: true,
  ownerMatch: true,
  acceptsCredits: true,
  verifiedAt: ...
}

Keep this separation clean.

============================================================
22. PROOF STORAGE
============================================================

Use Netlify Blobs for proof tokens where appropriate.

Store:

proof ID
minimum claims
createdAt
expiresAt
status

Do not store sensitive mock data unnecessarily.

If server-side signing is unavailable without introducing a secret:

use opaque random proof IDs backed by server-side storage.

Do NOT falsely describe them as cryptographically signed.

If an authorised Netlify secret is configured:

a proper signed token may be used.

Never commit secrets.

============================================================
23. DEMO DATA
============================================================

Seed deterministic scenarios.

SCENARIO 1 — OFFICIAL CONTACT

Input:

+27 86 0018 555

Expected:

OFFICIAL

SCENARIO 2 — LOOKALIKE URL

Input:

https://mukuru-secure-pay.co.za/verify

Expected:

NOT_OFFICIAL

Reason:

LOOKALIKE_DOMAIN

SCENARIO 3 — PHISHING MESSAGE

Input:

“Your Mukuru account will be blocked today.
Pay R250 verification fee and send your OTP here:
https://mukuru-verify-now.example”

Expected:

NOT_OFFICIAL

Reasons include:

UPFRONT_FEE
REQUESTS_OTP
ACCOUNT_BLOCK_THREAT
UNKNOWN_LINK

SCENARIO 4 — UNKNOWN LOCATION

Input:

“Mukuru collection point, 19 Random Road, Johannesburg”

Expected:

CANT_CONFIRM

unless it deliberately exists in the official demo registry.

SCENARIO 5 — MUKURUPROOF

Generate proof.

Open verifier.

Expected:

VALID

Wait / manipulate expiration in test.

Expected:

EXPIRED

============================================================
24. FALSE POSITIVE DISCIPLINE
============================================================

This matters heavily.

TrustShield must not scream SCAM at everything.

Policy:

Hard official match
→ OFFICIAL

Hard contradictory identity / known unsafe signal
→ NOT_OFFICIAL

Insufficient evidence
→ CANT_CONFIRM

Use multiple signals where possible.

Explain reasons.

Never display arbitrary percentages such as:

“97.3% scam”

unless the model genuinely produces a calibrated probability.

For our rules engine, use verdict + reason codes.

This is clearer and more honest.

============================================================
25. SECURITY
============================================================

Threat-model at least:

- XSS through pasted messages;
- malicious URLs;
- SSRF;
- huge payload abuse;
- report spam;
- Unicode confusable domains;
- Punycode;
- fake subdomains;
- path tricks;
- HTML injection;
- forged proof IDs;
- proof replay after expiry;
- excessive PII storage.

Do not:

- navigate to pasted URLs automatically;
- fetch pasted URLs server-side;
- render pasted text as raw HTML;
- store PIN/OTP values;
- log sensitive data unnecessarily.

Escape user text.

Set reasonable input limits.

============================================================
26. PERFORMANCE / LOW DATA
============================================================

The application must be light.

Target:

- fast first load;
- no giant image assets;
- minimal JavaScript;
- no external AI call for normal checking;
- compressed assets;
- lazy-load non-core MukuruProof screens if useful.

Core checker should work quickly even on slower connections.

============================================================
27. DEMO MODE
============================================================

Build judge-friendly deterministic demo mode.

Provide sample input buttons.

No fragile dependency should be required for the demonstration.

The application should continue working even if:

- external APIs are unavailable;
- the internet is slow after initial load.

Official demo data lives locally in the repository.

Netlify persistence enhances functionality but the checker logic
does not depend on it.

============================================================
28. DEMO STORY — 5 TO 7 MINUTES
============================================================

Create:

docs/DEMO_SCRIPT.md

Recommended flow:

OPEN:

“Blessing has just arrived in a new city and is looking for work.
A message claiming to be Mukuru lands on her phone.”

STEP 1:

Paste legitimate Mukuru contact.

TrustShield:

OFFICIAL.

STEP 2:

Paste lookalike Mukuru URL.

TrustShield:

NOT OFFICIAL — STOP.

Explain domain intelligence.

STEP 3:

Paste fake job / account message asking for a fee and OTP.

TrustShield identifies multiple red flags.

Switch interface into Shona.

Then Portuguese.

Show that the warning remains clear.

STEP 4:

Paste unknown physical pickup location.

TrustShield:

CAN’T CONFIRM.

Explain false-positive discipline.

STEP 5:

Report the scam.

Refresh / second browser.

Show report count persisted.

STEP 6:

“Mukuru can also turn the same trust infrastructure around.”

Open MukuruProof.

Generate QR.

Open verifier.

Explain retirement-fund / employer payout example.

CLOSE:

“TrustShield helps you know whether you can trust who is asking
for your money.

MukuruProof helps others trust where legitimate money should go.

One trust layer.
Two sides of financial safety.”

============================================================
29. WHY WE ARE DIFFERENT
============================================================

Do NOT build just another:

“Paste message → AI says scam.”

Our differentiators are:

1. Authoritative Mukuru identity verification.
2. Exact contact and domain validation.
3. Lookalike-domain detection.
4. Physical-location verification.
5. Explainable content rules.
6. Conservative three-state verdict.
7. Shared community warning signals.
8. English, Portuguese and Shona.
9. Simple emerging-consumer UX.
10. MukuruProof financial-identity extension.
11. Standalone API that plugs into anything.

The central insight:

SCAM DETECTION ASKS:
“Does this look suspicious?”

TRUSTSHIELD ALSO ASKS:
“Is this actually Mukuru?”

============================================================
30. UI QUALITY BAR
============================================================

This is a 25% UX challenge.

Do not accept developer-looking UI.

The final product must look presentation-ready.

Run visual QA at:

320px
360px
390px
768px
1440px

No:

- clipping;
- overflowing URLs;
- tiny text;
- broken cards;
- strange whitespace;
- default browser components;
- placeholder styling;
- generic Bootstrap feel.

Create strong loading states:

“Checking…”

Use subtle shield animation if appropriate.

Do not overanimate.

============================================================
31. TESTS
============================================================

Unit-test:

phone normalisation
official phone match
domain exact match
www domain match
lookalike domains
malicious subdomain
punycode handling
message extraction
PIN rule
OTP rule
release-fee rule
unknown location
official location
report count logic
language fallback
proof expiry

Integration-test:

POST /api/check

official
not official
can't confirm

Test all expected schema fields.

Test report persistence where supported.

E2E-test core judge flow if practical.

============================================================
32. README
============================================================

Create a polished README including:

- challenge;
- problem;
- solution;
- screenshots;
- architecture;
- supported languages;
- local setup;
- API contract;
- simulated data disclosure;
- security;
- privacy;
- deployment;
- demo instructions;
- limitations;
- future Mukuru integration path.

Clearly say:

THIS IS A HACKATHON PROTOTYPE.

Official contacts are sourced from Mukuru public channels.

AVS / Mukuru internal integrations are simulated.

============================================================
33. SOURCE OF TRUTH
============================================================

Use Mukuru’s own official public sources where possible:

https://www.mukuru.com/sa/
https://www.mukuru.com/sa/help-support/
https://www.mukuru.com/sa/fraud-prevention/
https://www.mukuru.com/sa/find-us/
https://www.mukuru.com/about-us/press-media-kit/

Do not use random blogs as the authority for Mukuru contact data.

Record source links alongside registry entries.

============================================================
34. GIT
============================================================

If repository is empty:

initialise the project.

Use coherent commits.

Before push:

npm run lint
npm run typecheck
npm test
npm run build

All must pass.

Commit examples:

feat(checker): implement official identity verification
feat(i18n): add English Portuguese and Shona
feat(reports): persist community warnings
feat(proof): add MukuruProof verification flow
test(checker): cover phishing and lookalike domains
docs(demo): add hackathon presentation flow

Push to the configured origin.

Do not force push.

============================================================
35. NETLIFY
============================================================

Deploy the application to Netlify.

Use:

netlify.toml

Frontend:
Vite build output.

Backend:
Netlify Functions.

Persistence:
Netlify Blobs.

Expose clean routes:

/api/check
/api/report
/api/proof/create
/api/proof/:id

or equivalent clean Netlify function mappings.

Use Netlify’s established routing/function configuration.

Do not expose secret values.

If Netlify CLI is authenticated:

build and deploy automatically.

If a Netlify project is not yet linked and the available tools
permit creating one:

create/link it.

Use an appropriate site name based on:

mukuru-trustshield

Then:

deploy production.

============================================================
36. POST-DEPLOYMENT VERIFICATION
============================================================

A successful deploy command is NOT enough.

Test the live URL.

Verify:

Homepage loads.

English works.

Portuguese works.

Shona works.

Official number → OFFICIAL.

Fake URL → NOT OFFICIAL.

Unknown location → CAN’T CONFIRM.

Scam message → NOT OFFICIAL with explainable reasons.

Report button works.

Report count persists.

MukuruProof creates proof.

Verifier loads proof.

Expired proof fails.

Mobile viewport works.

No console-breaking errors.

============================================================
37. FINAL RED TEAM
============================================================

Before declaring success, attack the product.

Ask:

What if a URL contains mukuru.com in the path?

What if the real hostname is evil.com?

What if input has uppercase characters?

What if the phone number contains spaces?

What if a number is unknown but harmless?

What if the location spelling is slightly different?

What if the scam is written in Portuguese?

What if the scam is written in Shona?

What if the user enters HTML?

What if they paste 100,000 characters?

What if the proof has expired?

What if one malicious user reports an official Mukuru number?

Fix any critical findings.

============================================================
38. FINAL REPORT
============================================================

Create:

docs/FINAL_HACKATHON_REPORT.md

Include:

Product status
Live Netlify URL
Git branch
Final commit SHA
Tests
Build result
Languages
API endpoints
Demo scenarios
Known limitations
Simulated integrations
Security decisions
Judge-rubric mapping

Explicitly map evidence against:

FUNCTIONALITY — 40
CREATIVITY & UX — 25
TECHNICAL IMPLEMENTATION — 25
PRESENTATION & TEAMWORK — 10

============================================================
39. DEFINITION OF DONE
============================================================

Do not stop until locally resolvable items pass.

DONE means:

Working responsive frontend
Working backend
Official contact checker
URL verification
Lookalike detection
Phone verification
Location verification
Message scam detection
Three-state result model
Plain-language reason
Next-step guidance
English
Portuguese
Shona
Report function
Shared report persistence
TrustShield CallLock (see section 42)
MukuruProof
Verifier page
AVS simulation clearly labelled
Accessibility
Tests
README
Demo script
Git commit
Git push
Netlify production deploy
Live smoke test
Final report

============================================================
40. FINAL RESPONSE
============================================================

When finished, respond concisely:

MUKURU TRUSTSHIELD — DEPLOYED

Then provide:

Live URL:
Repository:
Final commit:
Tests:
Languages:
Core checker:
MukuruProof:
Known limitations:
Demo script:
Final report:

Do not say deployed unless the live Netlify site was actually tested.

============================================================
41. CENTRAL PRODUCT INVARIANT
============================================================

Never forget the core:

TrustShield should protect a customer who may not be technically
sophisticated.

The user should not need to understand:

DNS
domains
AVS
phishing
AML
machine learning
risk scores
URL parsing

They should only need to understand:

OFFICIAL MUKURU

NOT OFFICIAL — STOP

CAN’T CONFIRM

and exactly what to do next.

============================================================
42. TRUSTSHIELD CALLLOCK — P0 (FINAL FOUNDER REQUIREMENT)
============================================================

Feature name:

TRUSTSHIELD CALLLOCK

Purpose:

A Mukuru customer should not be allowed to complete a sensitive
money transaction while they are actively on a phone call.

Threat model:

Scammers frequently keep victims on a live call while guiding them
through:

- sending money;
- adding a recipient;
- sharing credentials;
- confirming a transfer;
- paying a fake job fee;
- paying a fake release fee.

TrustShield creates a deliberate break between the scammer's live
influence and movement of the customer's money.

Core policy:

ACTIVE CALL
+
SENSITIVE FINANCIAL ACTION
=
PAUSE TRANSACTION

Show:

CALL IN PROGRESS

For your protection, you can’t send money while you’re on a call.

Scammers may stay on the phone and guide you through a transfer.

End the call first. Then come back and check the payment again.

Do NOT provide a "Continue anyway" button in the hackathon flow.

After the call ends, DO NOT automatically send or continue the payment:

CALL ENDS
→ RE-RUN TRUSTSHIELD CHECKS
→ SHOW RECIPIENT + AMOUNT + RISK RESULT
→ REQUIRE CUSTOMER CONFIRMATION

Privacy constraint — CallLock must NEVER:

- record the call;
- access call audio;
- transcribe conversations;
- analyse voices;
- identify what is being said.

It only needs: ACTIVE | INACTIVE | UNKNOWN

interface CallSafetyProvider {
  getCallState(): Promise<"ACTIVE" | "INACTIVE" | "UNKNOWN">
}

For the responsive Netlify web prototype, do NOT claim that the
browser can reliably detect native cellular call state.

Implement SimulatedCallSafetyProvider with polished demo controls:

[ Simulate scam call ]   → callState = ACTIVE
[ Simulate call ended ]  → callState = INACTIVE → re-run evaluation

Seeded scenario:

Blessing receives a fake-job call. Caller says:

"We need R850 to activate your Mukuru employment account.
Stay on the phone and I'll show you where to send it."

Blessing attempts to send R850 → CallLock PAUSES TRANSACTION.

Call ends → TrustShield detects:

NEW_RECIPIENT
UPFRONT_FEE
FAKE_JOB_CONTEXT

and returns: NOT OFFICIAL — STOP

CallLock copy must exist in English, Portuguese and Shona.

CallLock must appear in: architecture, UI, domain policy, demo mode,
tests, README, DEMO_SCRIPT.md, FINAL_HACKATHON_REPORT.md,
judge-rubric evidence and the Definition of Done.

Required tests:

ACTIVE + sensitive transaction → paused
INACTIVE → normal TrustShield processing
ACTIVE → INACTIVE → transaction never auto-sends
UNKNOWN → does not falsely claim call protection
CallLock → never accesses audio/content

Definition of Done addendum (extends section 39):

CallLock domain policy
CallLock simulated provider + demo controls
CallLock UI in English, Portuguese and Shona
CallLock tests (paused / normal / never auto-sends / unknown / no audio)
CallLock live smoke test (transaction remains unsent after call ends)

Live smoke test addendum (extends section 36):

CallLock demo pauses the transaction during an active simulated call.
After the simulated call ends the payment is re-checked, not sent.

Final judge experience (complete order):

1. OFFICIAL MUKURU — a real seeded official Mukuru contact.
2. NOT OFFICIAL — STOP — a lookalike Mukuru URL.
3. SCAM MESSAGE ANALYSIS — fake job/payment message asking for money/OTP.
4. CAN’T CONFIRM — an unknown location.
5. MULTILINGUAL UX — English, Portuguese, Shona.
6. COMMUNITY REPORTING — persisted warning count.
7. CALLLOCK — pause during call; re-check (not send) after call.
8. MUKURUPROOF — proof, verifier, minimum claims only.

Build that product.

Ship it.
