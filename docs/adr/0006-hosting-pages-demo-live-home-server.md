# ADR-0006: GitHub Pages for the public demo; live app served from the home server

- Status: Proposed
- Date: 2026-10-22

## Context

The owner wants free hosting on GitHub Pages during development and a secure production setup later,
with the repository eventually private. GitHub Pages is static and public; from a private repository
it needs a paid plan and the site is still public (access control only on Enterprise Cloud).
Browsers also increasingly restrict public sites from reaching private network addresses.

## Decision

- GitHub Pages hosts the demo build permanently (simulated devices, generic demo house, no private
  data), deployed by GitHub Actions on every merge to `main`.
- The live build is the same artefact, served by Caddy on the home server under the owner's domain,
  reachable on the LAN and via Tailscale only. The server pulls released artefacts.
- When the repository goes private, the public demo either stays on Pages (paid plan) or moves to a
  separate public demo repository. Private previews, if needed, use Cloudflare Pages + Access.

## Consequences

- Demo and live are separated by hosting, not just by a flag.
- The live app loads and works without internet.
- Base path and environment come from runtime configuration (ADR-0007).
