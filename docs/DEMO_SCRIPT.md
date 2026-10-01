# Mukuru TrustShield Demo Script

Target length: 5-7 minutes.

## Opening

“Blessing has just arrived in a new city and is looking for work. A message claiming to be Mukuru lands on her phone.”

## 1. Official Mukuru

Open TrustShield and select **Official Mukuru WhatsApp**. Show the official verdict and the PIN/OTP reminder. Explain that this proves the identity matches a seeded public Mukuru record, not that every future interaction is automatically safe.

## 2. Lookalike URL

Select **Fake Mukuru link**. Show **Not official - stop** and the lookalike-domain reason. Point out that TrustShield parses the hostname and does not trust `mukuru.com` when it appears only in a path or malicious subdomain.

## 3. Scam message and languages

Select **Suspicious message**. Show the fee, OTP, fake-job, urgency, and link signals. Switch to Portuguese, then Shona, and show that the verdict and next step remain clear.

## 4. Unknown location

Select **Unknown location**. Show **Can't confirm**, explaining the false-positive discipline: an unknown pickup point is not automatically called fraudulent. The user should add the street and town or confirm through official channels.

## 5. Community reporting

Report the suspicious entity, confirm the report, then check the same entity again or use another browser context. Show the persisted warning count. Explain that reports are a shared signal, not definitive proof by themselves.

## 6. CallLock

Open `/calllock`. The seeded scenario is Blessing receiving a fake-job call: “We need R850 to activate your Mukuru employment account. Stay on the phone and I'll show you where to send it.”

1. Click **Simulate scam call**.
2. Attempt to send R850 to the new recipient.
3. Show **CALL IN PROGRESS** and the paused transaction. There is no “Continue anyway” action.
4. Click **Simulate call ended**.
5. Show that TrustShield re-runs the check and returns **Not official - stop** for `NEW_RECIPIENT`, `UPFRONT_FEE`, and `FAKE_JOB_CONTEXT`.
6. Point to the money status: it remains unsent. CallLock never records or analyses call audio.

## 7. MukuruProof

Open `/proof`, generate the synthetic proof, and open its verifier. Show identity, account ownership, active status, and ability to receive credits, while pointing out that balance, history, statements, and raw identity documents are not disclosed. Mention the expiry behavior.

## Closing

“TrustShield helps you know whether you can trust who is asking for your money. MukuruProof helps others trust where legitimate money should go. One trust layer, two sides of financial safety.”
