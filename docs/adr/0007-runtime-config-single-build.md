# ADR-0007: One build, runtime configuration

- Status: Proposed
- Date: 2026-10-22

## Context

The public repository and public demo must not contain service addresses, keys or location data,
yet the same code must run against the real house.

## Decision

- The app is built once. At startup it fetches `config.json` next to `index.html`, validated by a
  Zod schema. It selects the mode (`demo` | `live`), the adapters, and the endpoints.
- The Pages deployment ships `{ "mode": "demo" }`. The home server ships the live config.
- Build-time variables are limited to non-sensitive values (version, base path).

## Consequences

- No rebuild to change environments; no private values in the bundle.
- Live adapters are lazy-loaded so the demo bundle does not pay for them.
