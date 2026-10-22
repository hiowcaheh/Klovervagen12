# ADR-0001: Local control plane, cloud management plane

- Status: Proposed
- Date: 2026-10-22

## Context

The app controls a real house. The owner requires that basic control (lights, blinds, heating) keeps
working without internet and without any cloud service, while still being reachable securely from
anywhere. The owner also wants to use an existing paid Supabase plan.

## Decision

- Commands and live state flow only between the app and Home Assistant, over the LAN or Tailscale.
- Supabase stores configuration, identity, history and private assets. The app caches what it needs
  (configuration in IndexedDB, assets in the service worker cache) to start and operate offline.
- Supabase is never in the path of a device command.

## Consequences

- An internet or Supabase outage does not stop control.
- Configuration edits need connectivity.
- Two identities exist on a device: a Supabase session (app, config) and a Home Assistant session
  (control). Accepted; a local bridge may merge them later without breaking offline control.
