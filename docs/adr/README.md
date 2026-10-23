# Architecture Decision Records

Each ADR records one decision: its context, the decision and its consequences. ADRs are not edited
after acceptance; a later ADR supersedes an earlier one.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-local-first-control-plane.md) | Local control plane, cloud management plane | On hold |
| [0002](0002-home-assistant-integration-engine.md) | Home Assistant as the integration engine; no custom integration server yet | On hold |
| [0003](0003-supabase-management-plane.md) | Supabase as the management plane; no device state in the cloud | On hold |
| [0004](0004-blender-source-of-truth-hybrid-rendering.md) | Blender model as source of truth; hero renders with light layers plus real-time 3D | On hold |
| [0005](0005-cameras-poe-frigate-eufy-interim.md) | Wired PoE cameras with go2rtc and Frigate; Eufy only during renovation | On hold |
| [0006](0006-hosting-pages-demo-live-home-server.md) | GitHub Pages for the public demo; live app served from the home server | On hold |
| [0007](0007-runtime-config-single-build.md) | One build, runtime configuration | On hold |
| [0008](0008-typescript-6-until-ecosystem-ready.md) | TypeScript 6.0 until the lint ecosystem supports 7 | On hold |
| [0009](0009-music-assistant-sonos.md) | Sonos and Spotify through Music Assistant | On hold |
| [0010](0010-public-repository-privacy.md) | Privacy rules for the public repository | Accepted |
| [0011](0011-apple-home-and-planner.md) | Apple Home for devices; installation planner on GitHub Pages with Supabase login | Accepted |

Template for new ADRs: copy any file, keep the headings, number sequentially.
