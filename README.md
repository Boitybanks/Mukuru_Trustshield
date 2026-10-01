# Mukuru TrustShield

**Trust before transfer.**

Mukuru TrustShield is a Challenge C hackathon prototype that helps customers check a phone number, URL, message, or location before acting. It also demonstrates **TrustShield CallLock**, which pauses sensitive money actions during an active call, and **MukuruProof**, a minimum-disclosure proof that a fictional account can receive credits.

> **This is a hackathon prototype, not an official production Mukuru service.**

## What It Demonstrates

- Official Mukuru contact, URL, and seeded location matching
- Lookalike-domain and Unicode/punycode handling without fetching pasted URLs
- Explainable message rules for OTP/PIN requests, fees, urgency, impersonation, and fake jobs
- Three honest verdicts: Official Mukuru, Not official - stop, and Can't confirm
- Shared community reports persisted through Netlify Blobs in production
- English, simple Mozambican Portuguese, and Shona
- CallLock: ACTIVE + sensitive action pauses; after a call ends, TrustShield re-checks and never auto-sends
- MukuruProof QR/verifier flow with synthetic data and short-lived opaque IDs

## Local Setup

```bash
npm install
npm run dev
```

Run the release checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The local E2E suite starts a dedicated Vite server with the same handlers backed by in-memory repositories. Production builds use the Netlify Vite plugin and Netlify Functions.

## Architecture

- `src/domain`: pure normalisation, rule, verdict, CallLock, transaction, and proof policies
- `src/features`: responsive React flows for checking, CallLock, reports, and MukuruProof
- `server/handlers.ts`: framework-independent validated API handlers
- `netlify/functions`: production function adapters
- `server/blobRepositories.ts`: site-wide Netlify Blobs persistence
- `src/data/officialRegistry.ts`: official public-source seed records

API routes:

- `POST /api/check`
- `POST /api/report`
- `GET /api/reports/:canonicalKey`
- `POST /api/transaction/check`
- `POST /api/proof/create`
- `GET /api/proof/:id`

## Safety and Privacy

TrustShield never fetches arbitrary pasted URLs and never renders pasted content as HTML. Input is size-limited and validated with Zod. Reports store canonical entity data and reason codes rather than the original message. CallLock only consumes `ACTIVE`, `INACTIVE`, or `UNKNOWN`; it never records audio, reads call content, transcribes, or analyses voices. Browser permissions explicitly disable microphone, camera, geolocation, payment, USB, and Bluetooth access.

A community report is a signal, not authoritative proof. Unknown evidence remains **Can't confirm** rather than being labelled fraudulent.

## Simulated Integrations and Limitations

- Native cellular call-state detection is not available to a normal browser; the demo uses `SimulatedCallSafetyProvider` and a clearly marked unsupported browser provider.
- Account verification is provided by `SimulatedAccountVerificationProvider` using synthetic Blessing Ndlovu data.
- Official contacts and location records are seeded from Mukuru public sources for the hackathon; this is not a live Mukuru internal registry.
- No payment is ever moved by the prototype.

## Demo

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the 5-7 minute judge flow. Responsive screenshots are generated under `docs/screenshots/` by visual QA.

## Disclaimer

Mukuru TrustShield is an independent hackathon prototype. Official public-source references are kept beside the seed records. AVS, Mukuru internal systems, native call-state detection, and payment execution are simulated or intentionally absent.
