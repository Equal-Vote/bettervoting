---
layout: default
title: 🔑 Per-Election auth_key (External Integrations)
nav_order: 7
parent: 💻 Developers
grand_parent: Contribution Guide
---

# Per-Election `auth_key` (External Integrations)

This page documents the `auth_key` field on the `Election` object. It's a niche
feature aimed at **external integrations that create elections on a user's behalf**
— the discord bot is the motivating example. End-user election admins do not
interact with it; the BetterVoting web UI does not produce or consume it.

If you are designing or maintaining an external integration that needs to
manage elections it created, read this page in full before writing code.

## What `auth_key` is

`Election.auth_key` is a per-election **PEM-encoded RSA public key**. When
present on an election row, BetterVoting will accept management requests
against that election (edit, delete, etc.) only if the request carries a JWT
signed by the matching **private** key.

In practice that means:

- An external client (e.g. a discord bot) generates an RSA keypair on its own
  host.
- When it creates an election, it includes its public key as
  `Election.auth_key` in the create payload.
- For any later management call, the client signs a short-lived JWT with its
  private key and sends it in the `custom_id_token` cookie.
- The backend verifies the JWT against the election's stored `auth_key` and
  populates `req.user` from the verified claims.

Voter-side flows (casting ballots, viewing public results) do **not** use
`auth_key`. Voters continue to authenticate via the standard mechanisms
described in [Voter Authentication Modes](6_voter_authentication_modes.html).
`auth_key` is for **owner-equivalent** operations only.

## Why this exists

The platform-managed identity story (Keycloak via `id_token` cookie) requires
each end user to log into BetterVoting. That doesn't work for integrations
where the *creator* of an election is a bot or service rather than a human
with a BetterVoting account. `auth_key` lets such a service prove it owns an
election without going through Keycloak, by holding the private key for that
election locally.

It is **not** a feature you should expose to election admins via the BV web
UI. It exists to support trusted external integrations.

## Algorithm and key format

- Algorithm: **RS256 only.** HS256 is rejected at both write time
  (`electionValidation` in `packages/shared/src/domain_model/Election.ts`)
  and verify time (`AccountServiceUtils.extractUserFromRequest`).
- Format: PEM, SPKI public key. The string must contain
  `-----BEGIN PUBLIC KEY-----`. PKCS#1 (`-----BEGIN RSA PUBLIC KEY-----`) and
  raw certificate forms are rejected.

A minimal Node generator:

```ts
import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
// publicKey  → goes on Election.auth_key
// privateKey → stays on the integration's host, never sent to BV
```

A minimal Python generator:

```python
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_pem = key.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
).decode()
private_pem = key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
).decode()
```

## Why RS256 (and not HS256)

HS256 uses one shared secret for both signing and verifying. If we accepted
HS256 keys, BetterVoting would have to **store the signing secret** in its
database in order to verify tokens. That means:

- The platform itself holds material that can authenticate as the election
  owner. Trust-wise, BV becomes part of the integration's owner-equivalent
  trust set, not just a relying party.
- Any future read of the DB — backup leak, log misconfiguration, ransomware,
  insider access broadening — exfiltrates active signing keys for every
  HS256-using integration.
- Collateral channels (TLS terminations, application error logs, Sentry
  payloads, replicas, `pg_dump` artifacts) all transit the live secret.

With RS256, the platform only ever sees public keys. The integration's
private key never leaves the integration's host. A future BV-side compromise
yields no useful material against past or future elections.

The cost on the integration side is essentially zero: keypair generation is
one function call, and PEM is one extra newline character compared to a hex
string. We treat RS256 as the only supported algorithm.

## Lifecycle and storage on the integration side

1. **Key generation.** The integration generates its keypair once, at
   first-run setup. The keypair can be **per-deployment** (one keypair for
   all elections that deployment creates) or **per-election** (a new keypair
   each time). Per-deployment is simpler and is what we recommend for most
   integrations.
2. **Private-key storage.** The private key lives on the integration's host
   only — `.env`, a secrets manager, KMS, etc. It must **not** be checked into
   the integration's source repository: anyone forking the repo would
   otherwise gain owner-equivalent access to every election created by every
   deployment that uses that fork's default key.
3. **Public-key transmission.** The public key is sent to BetterVoting once
   per election, in the `Election.auth_key` field of the create payload.
4. **Signing management requests.** The integration mints a JWT signed with
   its private key, sets it as the `custom_id_token` cookie, and calls the
   management endpoint. Keep JWT lifetimes short (minutes, not days) — there
   is no revocation mechanism beyond rotating the election's `auth_key`.

The verified JWT's claims populate `req.user`. Useful claim conventions:

| Claim | Used by |
|---|---|
| `sub` | The user ID associated with the request. |
| `email` | Treated as a verified email by downstream code that reads `req.user.email`. Set this only if your integration has actually verified the email. |

## Worked example (Python)

```python
import jwt, requests, time

PRIVATE_KEY = open('integration_private.pem').read()  # PKCS#8 PEM
PUBLIC_KEY  = open('integration_public.pem').read()   # SPKI PEM

# Create the election
payload = {
    "Election": {
        "title": "Demo poll",
        "state": "open",
        "races": [...],
        "settings": {...},
        "auth_key": PUBLIC_KEY,
    },
}
create_resp = requests.post(
    "https://bettervoting.com/API/Elections",
    json=payload,
)
election = create_resp.json()["election"]
election_id = election["election_id"]

# Later: delete the election when the discord poll ends
mgmt_token = jwt.encode(
    {
        "sub": "discord-bot-instance-42",
        "iat": int(time.time()),
        "exp": int(time.time()) + 60,  # 1-minute lifetime
    },
    PRIVATE_KEY,
    algorithm="RS256",
)
requests.delete(
    f"https://bettervoting.com/API/Election/{election_id}",
    cookies={"custom_id_token": mgmt_token},
)
```

## Threat model — what `auth_key` protects against, and what it doesn't

`auth_key` is a narrow mechanism. It protects exactly one thing: **only the
holder of the integration's private key can perform owner-equivalent
operations on an election that was created with the matching public key.**

### What it does protect against

- *A different operator running the same integration code.* Each operator
  holds their own private key. They can only manage their own elections.
- *A fork of the integration's repo.* Forks ship without a default keypair,
  so they cannot reach back and impersonate the original integration's
  elections.
- *Frontend `owner_id` spoofing.* The cryptographic check on `auth_key`
  bypasses the value of `owner_id` for elections that opt into this
  mechanism. (Note that the underlying `owner_id`-trust issue elsewhere in
  the system is tracked separately; `auth_key` doesn't fix it for elections
  that don't use `auth_key`.)
- *Future BetterVoting DB read.* Since BV stores only the public key, a DB
  exfiltration does not yield signing material for integration-managed
  elections.

### What it does **not** protect against

- *Voters in an integration-managed election.* `auth_key` is owner-side
  only. Voter authentication is governed by the election's
  `voter_authentication` settings (see [Voter Authentication
  Modes](6_voter_authentication_modes.html)), not by `auth_key`.
- *A compromised integration host.* If the integration's private key leaks
  (host break-in, accidental commit, leaked backup), the attacker can manage
  every election created with the matching public key. Rotation requires
  setting a new `auth_key` on each affected election individually.
- *A malicious integration acting on its own elections.* By design, the
  integration is owner-equivalent for its own elections. Nothing here
  prevents the integration from, e.g., deleting the elections it created.
- *Revocation of issued JWTs.* There is no jti / blocklist. Use short
  expirations (`exp`) and rotate `auth_key` if you suspect a key compromise.
- *Replay across elections.* The JWT itself does not bind to an election
  ID; if a token signed by key K is intercepted, it can be replayed against
  any election whose `auth_key` is the matching public key for K. Mitigate
  with short `exp` values; consider per-election keypairs if your threat
  model requires hard isolation.

## Operational rules for integrations

If you are writing or reviewing an external integration that uses
`auth_key`, the following must hold:

1. **No default keypair in the repo.** First-run setup generates or requires
   an operator-supplied private key. CI tests may use ephemeral keys, but
   the production code path must never fall back to a baked-in key.
2. **Private key in a secret store, not in the codebase or in logs.** `.env`
   is the floor; secrets managers / KMS are preferred for anything that
   serves real users.
3. **Short-lived JWTs.** `exp` should be on the order of seconds to a few
   minutes. There is no revocation; expiry is the only safety net.
4. **Document the key-rotation procedure.** If your private key is
   compromised, you must be able to re-issue and push a new `auth_key` to
   every election you've created that still matters. Plan this before you
   need it.  Note that as soon as you push a new public auth_key to an election, 
   all future edits to the election will need a JWT signed by the new corresponding
   new private key.  
5. **Don't expose `auth_key` to end users.** It is an integration-internal
   concept. End users of your integration should never see the value, and
   should not be able to set it.

## Backend implementation pointers

- Field on `Election`: `packages/shared/src/domain_model/Election.ts`
- Write-time validation (RS256 PEM-public-key requirement):
  `electionValidation` in the same file.
- Read-side stripping: `removeHiddenFields` in the same file. Called from
  `returnElection` (`Controllers/Election/elections.controllers.ts`) **only
  when the requester is not an owner or admin** of the election. Owner-
  authenticated reads retain `auth_key` so integrations can do read-modify-
  write edits and verify the stored key. Listing endpoints
  (`getElectionsController.ts`) always strip — fetch the individual election
  if you need the key.
- Verifier: `AccountServiceUtils.extractUserFromRequest` in
  `packages/backend/src/Services/Account/AccountServiceUtils.ts` —
  RS256-locked, PEM-public-key-only.
- Middleware: `electionSpecificAuth` in
  `packages/backend/src/Controllers/Election/elections.controllers.ts` —
  wired into `/API/Elections/:id`, `/API/Ballots/:id`, and `/API/Roll/:id`
  param hooks.
- End-to-end test: `packages/backend/src/test/customAuthKey.test.ts`.

## Future work

Things that are deliberately not in scope today but may be worth doing if
this surface grows:

- **JWKS URLs.** Hosting a JWKS endpoint per integration would let
  integrations rotate keys without re-issuing `auth_key` on every election.
  Today, key rotation is per-election.
- **Per-election binding in JWT claims.** Requiring `aud` to match the
  election ID would close the replay-across-elections gap noted above
  without forcing per-election keypairs.
