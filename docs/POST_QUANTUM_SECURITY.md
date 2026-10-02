# Post-quantum proof integrity

Every MukuruProof is signed with **ML-DSA-65** (NIST FIPS 204) when it is created
and checked again every time it is read.

| Step | Where | What happens |
| --- | --- | --- |
| Create | `POST /api/proof/create` | The stored record is signed; the response includes an `integrity` summary. |
| Verify page | `GET /api/proof/:id` | The signature is checked before expiry. A mismatch returns `409 { status: "TAMPERED" }`. |
| Payment | `POST /api/transaction/check` | A recipient proof whose signature fails is treated as `INVALID`, so the payment cannot reach confirmation. |

## What is signed

`canonicalProofPayload()` in `server/postQuantum.ts` covers every field a verifier
relies on: ID hash, subject ref, all four claims, holder name and account hint,
timestamps, status, provider and the simulated flag. The signature uses the fixed
context `mukuru-trustshield/proof/v1`, so a signature over anything else never
verifies as a proof.

## Key material

- Production: `TRUSTSHIELD_MLDSA_SEED`, a 32-byte seed (64 hex characters or
  base64url), stored as a secret Netlify environment variable.
- Without it the server uses a public, deterministic **dev key** (`devKey: true`).
  That keeps local development working but gives no protection, so set the
  secret in every real deployment.
- The `keyId` shown to verifiers is the first 16 hex characters of
  SHA-256(public key).

Generate a seed with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Tests

`tests/security/postQuantum.test.ts` covers signing, verification on read,
tampering (renamed holder, flipped claim, extended expiry, removed or forged
signature), a wrong key, payment blocking and seed parsing.
