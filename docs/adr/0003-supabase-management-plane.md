# ADR-0003: Supabase as the management plane

- Status: Proposed
- Date: 2026-10-22

## Context

The owner wants Supabase for users, permissions, home configuration, 3D placements, history and
assets. A `device_states` table mirroring live state was proposed.

## Decision

- Supabase holds: profiles, homes, members and roles (MFA for admins), floors, rooms, devices and
  capabilities metadata, 3D models and placements, dashboard layouts, scene and automation metadata,
  event log and audit, energy roll-ups, private 3D assets, Web Push sending.
- Live device state is not stored in Supabase. Home Assistant is the source of truth; the app holds
  live state in memory.
- Detailed time series stay in Home Assistant; Supabase receives hourly/daily roll-ups.
- The home pushes events outbound to an Edge Function with a per-home key. Supabase never connects
  into the home.
- A dedicated project in the Stockholm region; development uses a separate project or branch.

## Consequences

- No stale cloud copy of device state, no cloud latency in control.
- History older than Home Assistant retention is available only as roll-ups and events.
- RLS, MFA checks (`aal2`) and pgTAP tests are mandatory parts of every migration.
