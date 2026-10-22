# Home OS — Platform Design

| | |
|---|---|
| Status | Draft for owner review |
| Date | 2026-10-22 |
| Scope | Whole platform (architecture, data, 3D, design language, delivery). Implementation starts with the MVP (stages E1 + E2). |
| Decisions | Recorded as ADRs in [`docs/adr/`](../adr/README.md) |

> **Privacy rule for this document and this repository.** The repository is public. It contains code,
> demo data and generic documentation only. The real address, floor plans, photos, 3D model,
> camera placement, network details and any credentials of the owner's house never enter it.
> See [ADR-0010](../adr/0010-public-repository-privacy.md).

---

## 1. Purpose

A custom smart home platform for one real single-family house in Sweden, used every day by the
household on iPhone, on an iPad mounted in the kitchen wall, and on desktop browsers.

The centre of the product is an interactive 3D representation of the house that doubles as a
simplified digital twin: lamps glow when they are on, blinds sit at their real position, open windows
and detected motion are visible, offline devices are marked.

### Success criteria

1. Turning on a light from the app works with the internet down, and the UI never shows an
   unconfirmed state as a fact.
2. A physical change in the house (a wall switch, an opened window) is visible in the app within one
   second on the local network.
3. The same UI runs in **demo mode** (public GitHub Pages, simulated devices) and **live mode**
   (the real house) without code changes, only configuration.
4. The app feels fast on a mid-range iPhone: initial JS ≤ 250 KB gzip, 3D loaded lazily, smooth
   orbit on iPad.
5. A new device of a known kind is added to the house and the 3D twin with data only, no code.
6. The project can be continued by the owner and by future Claude sessions from the documentation in
   this repository alone.

### Non-goals (for now)

- Replacing Home Assistant's integrations with our own.
- A public multi-tenant product. One home, one household (the schema still keys everything by
  `home_id`).
- Running real device control from GitHub Pages.

---

## 2. Principles

1. **Local control plane, cloud management plane.** Commands and live state travel only inside the
   home network or over the VPN. Supabase holds configuration, identity and history, and the app
   caches what it needs to start offline. ([ADR-0001](../adr/0001-local-first-control-plane.md))
2. **Home Assistant is the integration engine.** We do not write our own device integration server
   until a concrete need appears. ([ADR-0002](../adr/0002-home-assistant-integration-engine.md))
3. **The UI does not know where data comes from.** Features talk to ports (interfaces); demo,
   Home Assistant and Supabase are adapters behind them.
4. **One build, many environments.** Environment differences live in a runtime `config.json`, never
   in the bundle. ([ADR-0007](../adr/0007-runtime-config-single-build.md))
5. **Honest state.** A command is not a fact. Pending, confirmed, failed and stale are distinct,
   visible states.
6. **Performance is a feature.** Render on demand, lazy-load 3D, compress assets, tier quality per
   device.
7. **Small, replaceable units.** No god components. Each module has one job, a typed interface and
   tests.

---

## 3. System architecture

```
  iPhone · iPad (wall) · desktop
 ┌───────────────────────────────────┐
 │ WEB APP (React PWA)               │
 │ UI · 3D twin · live state · cache │
 └──────┬─────────────────────┬──────┘
        │ control + state     │ config, auth,
        │ WebSocket over LAN  │ history (HTTPS)
        │ or Tailscale        │
        ▼                     ▼
 ┌──────────────────┐  ┌───────────────┐
 │ HOME SERVER      │  │ SUPABASE (EU) │
 │ Home Assistant   │  │ Postgres, RLS │
 │ Music Assistant  │  │ Auth + MFA    │
 │ go2rtc + Frigate │  │ Storage (3D)  │
 │ MQTT, Zigbee2MQTT│  │ Edge Functions│
 │ Matter Server    │  │ Realtime(cfg) │
 │ Caddy (HTTPS)    │─►│ outbound only │
 └──┬──────┬──────┬─┘  └───────────────┘
    │      │      │
 Zigbee Thread  Ethernet/PoE · Wi-Fi
    ▼      ▼      ▼
 lights · blinds · sensors · cameras
 heating · ventilation · energy meter · speakers
```

### 3.1 Responsibilities

| Component | Owns | Never does |
|---|---|---|
| Web app | Presentation, 3D twin, in-memory live state, command tracking, offline cache of config and assets | Store device secrets; talk to devices directly |
| Home Assistant | Device integrations, current state, service calls, scenes and automations execution, detailed history (recorder, statistics), device credentials | Serve our UI |
| Music Assistant | Music sources (Spotify) and players (Sonos), queues, grouping | — |
| go2rtc + Frigate | Camera streams (WebRTC), recording, object detection, camera events | Expose streams publicly |
| Supabase | Users, roles, MFA; home configuration; 3D placements; dashboard layouts; scene/automation metadata; event log; energy roll-ups; private 3D asset storage; Web Push sending | Hold live device state; connect into the home |
| Caddy | HTTPS with a real certificate on the LAN, serving the live build | — |
| Tailscale | Remote access to the home server without open ports | — |

### 3.2 Network reachability

- The live app is served from the home server at an HTTPS name on the owner's own domain.
  Local DNS resolves it to the server on the LAN; Tailscale split DNS resolves it remotely. The
  certificate (Let's Encrypt, DNS-01) keeps working without internet.
- HTTPS is required: PWA install, service worker, WebRTC and wake lock need a secure context, and an
  HTTPS page cannot open `ws://` connections.
- Supabase is only ever called outbound. The home pushes events out through an Edge Function.
- Nothing in the home is port-forwarded on the router.

### 3.3 Environments

| Mode | Hosted on | Talks to | Data |
|---|---|---|---|
| `demo` | GitHub Pages (public) | In-browser simulator only | Generic demo house, demo devices |
| `live` | Home server (LAN + Tailscale) | Home Assistant, Supabase | The real house |
| `dev` | Local / Claude Code container | Simulator, optionally Supabase dev project | Test data only |

---

## 4. Frontend architecture

### 4.1 Layers

```
apps/web/src
  app/        bootstrap, providers, router, runtime config loading
  gateways/   adapters implementing the ports: demo/, homeassistant/, supabase/
  stores/     Zustand stores: device states, command tracker, UI state
  features/   dashboard, rooms, devices, cameras, scenes, music, energy, settings
  scene3d/    3D viewer, model loading, anchors, markers, visual-binding registry
  ui/         design system: tokens, primitives, motion presets, icons
  layouts/    phone, tablet, desktop, wall shells
packages/domain
  types, capability model, command model, Zod schemas, pure logic (no React, no I/O)
```

Dependency direction: `features → stores → (ports in packages/domain) ← gateways`. Features never
import an adapter directly; the active adapters are chosen once at bootstrap from runtime config.

### 4.2 Ports

```ts
interface DeviceGateway {
  connect(): Promise<void>;
  subscribe(listener: (event: DeviceStateEvent) => void): Unsubscribe;
  snapshot(): Promise<DeviceState[]>;
  send(command: DeviceCommand): Promise<CommandReceipt>;
  onConnectionChange(listener: (status: ConnectionStatus) => void): Unsubscribe;
}

interface ConfigRepository {
  loadHome(): Promise<HomeConfig>;          // floors, rooms, devices, placements, layouts
  watch(listener: (change: ConfigChange) => void): Unsubscribe;
}

interface CameraGateway {
  listCameras(): Promise<CameraInfo[]>;
  openStream(cameraId: string, quality: 'sub' | 'main'): Promise<MediaStream | StreamHandle>;
  events(query: CameraEventQuery): Promise<CameraEvent[]>;
}

interface MusicGateway {
  players(): Promise<Player[]>;
  subscribe(listener: (event: PlayerEvent) => void): Unsubscribe;
  send(command: PlayerCommand): Promise<CommandReceipt>;
}
```

Adapters: `demo` (simulator with configurable latency and failure injection, used by the public
build and by tests), `homeassistant` (via `home-assistant-js-websocket`), `supabase` (config, auth,
events).

### 4.3 Command lifecycle

```
idle ──send──► pending ──state matches target──► confirmed ──► idle
                  │
                  ├──error from source──────────► failed
                  └──no match within timeout────► timed_out
```

- **pending** shows the target value styled as in progress, never as fact.
- **confirmed** when the reported state reaches the target. Covers move to `opening`/`closing`
  first, then the final position.
- **failed / timed_out** revert to the last confirmed state and offer "Try again".
- Timeouts are per capability (light ~5 s, cover start ~5 s, climate setpoint ~10 s).
- Devices Home Assistant marks with `assumed_state` are shown as "assumed", because they cannot
  confirm.

### 4.4 Connection and freshness

- Heartbeat (ping/pong), reconnect with exponential backoff and jitter.
- On reconnect and on `visibilitychange` to visible: full resubscribe; the subscription delivers a
  fresh snapshot.
- While disconnected, every live value is marked stale (dimmed, with "updated N min ago"). Stale data
  is never presented as current.

### 4.5 Offline behaviour

- App shell and the active 3D assets are cached by the service worker.
- `HomeConfig` is cached in IndexedDB; the app starts from it when Supabase is unreachable.
- Config edits require connectivity and say so.

### 4.6 State

- **Zustand** for high-frequency live state with selector subscriptions, so a lamp change re-renders
  one card and one 3D binding, not the tree.
- **TanStack Query** for configuration and history (caching, retries, offline persistence).
- No global "god store". One store per concern.

---

## 5. Domain model

### 5.1 Device and capabilities

A **device** is a physical thing in a room. It exposes **capabilities**; each capability is bound to a
source (for live mode, a Home Assistant entity and attribute).

| Capability | State | Commands |
|---|---|---|
| `onOff` | `on: boolean` | `turnOn`, `turnOff`, `toggle` |
| `brightness` | `0–100` | `setBrightness` |
| `colorTemperature` | kelvin | `setColorTemperature` |
| `color` | HS/RGB | `setColor` |
| `coverPosition` | `0–100`, `moving: 'opening' \| 'closing' \| null` | `open`, `close`, `stop`, `setPosition` |
| `coverTilt` | `0–100` | `setTilt` |
| `temperature` | °C (read-only) | — |
| `humidity` | % (read-only) | — |
| `co2` | ppm (read-only) | — |
| `climateSetpoint` | °C, mode | `setTarget`, `setMode` |
| `contact` | `open: boolean` | — |
| `motion` / `occupancy` | `detected: boolean`, `lastChanged` | — |
| `leak`, `smoke` | `alarm: boolean` | — |
| `power` / `energy` | W / kWh | — |
| `lock` | `locked \| unlocked \| jammed` | `lock`, `unlock` (critical) |
| `garageDoor` | `open \| closed \| opening \| closing` | `open`, `close` (critical) |
| `alarmPanel` | `disarmed \| armed_home \| armed_away \| triggered` | `arm`, `disarm` (critical) |
| `videoStream` | `online: boolean` | — |
| `mediaPlayer` | playback, volume, now playing | `play`, `pause`, `next`, `setVolume`, `group` |

Every device also carries `availability: 'online' | 'offline' | 'unknown'`.

UI cards and 3D bindings are chosen **by capability**, not by brand or device type.

### 5.2 Critical actions

`unlock`, `disarm`, `garageDoor.open` and any capability flagged critical require an explicit
confirmation gesture plus PIN or platform authenticator (Face ID via passkey), and are written to the
audit log. Future AI features can never execute them without a human confirmation.

---

## 6. 3D digital twin

### 6.1 Asset strategy ([ADR-0004](../adr/0004-blender-source-of-truth-hybrid-rendering.md))

- **Blender is the source of truth** for the house model, built from measured drawings, laser
  measurements, LiDAR scans and photos. Photogrammetry and Gaussian splatting are reference material
  only: a twin needs separate objects (each window, blind and lamp), relightable materials and a
  small file.
- **Two presentations of the same model:**
  1. **Hero views** (dashboard): pre-rendered photoreal images from fixed cameras (front, garden),
     day and night. Each lighting group is rendered as its own light layer and composited in the
     browser with additive blending weighted by the real brightness, so the picture lights up exactly
     the lamps that are on. Markers sit on projected anchor positions.
  2. **Real-time 3D** (`3D` view): the optimised GLB in React Three Fiber for free orbit, floors,
     roof toggle and rooms.
- Real house assets live in private Supabase Storage. The repository ships only the generic demo
  house.

### 6.2 Model conventions

- Units metres, Y-up (glTF), origin at a documented building corner.
- Node names (Blender object names, exported to glTF):
  `floor:<id>`, `room:<id>`, `roof`, `window:<id>`, `door:<id>`, `blind:<id>`, `lamp:<id>`,
  `anchor:<id>`, `camera:<id>`.
- Extra metadata through Blender custom properties, exported to glTF `extras`.
- Quality variants: `high` (desktop), `medium` (iPad), `low` (phone).
- Pipeline (`tools/3d`, gltf-transform): Meshopt geometry compression, KTX2 textures, variant
  generation, validation (size and triangle budgets, required nodes, naming).

### 6.3 Placements and visual bindings

`device_placements` binds a device to the model:

```jsonc
{
  "deviceId": "…",
  "modelId": "…",
  "anchor": { "type": "node", "node": "anchor:terrace_light_1" },
  // or { "type": "point", "position": [x, y, z], "floorId": "…" }
  "marker": { "icon": "lamp-wall", "offset": [0, 0.3, 0], "floors": ["ground"] },
  "binding": { "kind": "light-glow", "targets": ["lamp:terrace_1"], "radius": 4 }
}
```

The binding registry in `scene3d/bindings/` maps `kind` to a small module:
`light-glow`, `cover-position`, `opening-indicator`, `motion-pulse`, `room-temperature-tint`,
`camera-frustum`, and the global `offline-badge`. A new device of a known kind is a database row. A
new kind is one new module. When a new model version is imported, the validator lists placements
whose anchors no longer exist.

### 6.4 Rendering and performance

- `frameloop="demand"`: render only on interaction or state change. Critical for battery and the
  always-on wall panel.
- The 3D chunk (three.js and friends) is lazy-loaded; the dashboard renders first.
- Automatic quality tier from GPU capability plus a runtime performance monitor (adaptive pixel
  ratio).
- Day/night from sun position computed from the home location (stored privately, never in the
  repository). Night mode uses emissive materials and a capped number of dynamic lights per tier.
- WebGL2 renderer now; WebGPU is available in Safari 26 and can be adopted later without changing
  the scene graph.
- Explicit disposal of geometries, materials and textures on model change.

---

## 7. Data model (Supabase)

Project: a dedicated Supabase project in the Stockholm region. Development uses a separate project or
branch with test data only. Demo mode does not use Supabase.

### 7.1 What lives where ([ADR-0003](../adr/0003-supabase-management-plane.md))

| Data | Home Assistant | Supabase | App cache |
|---|---|---|---|
| Current device state | ✔ source of truth | ✘ | in memory |
| Device credentials | ✔ | ✘ | ✘ |
| Detailed time series | ✔ recorder + statistics | ✘ | ✘ |
| Rooms, devices, placements, layouts | ✘ | ✔ | ✔ IndexedDB |
| Users, roles, MFA | HA users for control | ✔ | session |
| Event log, audit | raises events | ✔ stored | recent |
| Energy roll-ups (hour/day, SEK) | computes | ✔ stored | ✔ |
| 3D assets of the real house | ✘ | ✔ private Storage | ✔ Cache API |

### 7.2 Tables (by group)

1. **Access**: `profiles` (1:1 with `auth.users`), `homes`, `home_members(home_id, user_id, role)`
   with role `owner | admin | member | guest | panel`. Later `access_rules` for per-room or
   per-device restrictions.
2. **Space**: `floors(home_id, name, level, elevation_m, sort)`, `rooms(home_id, floor_id null,
   name, kind, is_outdoor, sort, icon)`. Garden, terrace and driveway are rooms with
   `is_outdoor = true`.
3. **Devices**: `devices(home_id, room_id, name, category, manufacturer, model, is_critical,
   metadata)`, `device_capabilities(device_id, capability, source, source_ref, config)`,
   `cameras(device_id, stream_main, stream_sub, provider)` without credentials.
4. **3D**: `building_models(home_id, version, variants, storage_path, checksum, is_active)`
   (not `3d_models`: unquoted identifiers cannot start with a digit), `device_placements`,
   `room_placements(room_id, model_id, node)`, `camera_views(model_id, name, position, target, fov)`.
5. **Scenes and automations**: `scenes(home_id, name, icon, sort, ha_entity_id)`,
   `automations(home_id, name, description, ha_entity_id, enabled_hint)`. Home Assistant executes
   them; our UI presents and, later, authors them through Home Assistant's config API.
6. **History**: `events(home_id, occurred_at, type, severity, device_id, room_id, actor, payload)`,
   `energy_rollups(home_id, period_start, period, kwh, cost_sek, source)`. Retention by `pg_cron`.
7. **UI**: `dashboard_layouts(home_id, user_id null, screen, schema_version, layout)`,
   `user_preferences(user_id, home_id, prefs)`.
8. **Integrations**: `integrations(home_id, kind, public_config)` without tokens,
   `ingest_keys(home_id, key_hash, created_at, revoked_at)`.

JSON columns (`layout`, `binding`, `marker`, `prefs`) are versioned and validated with the same Zod
schemas from `packages/domain` on read and before write.

### 7.3 Security

- RLS enabled on every table. Helper functions `is_home_member(home_id)` and
  `has_home_role(home_id, roles)`; policies use `(select auth.uid())`.
- Administrative writes require MFA: policies check `auth.jwt() ->> 'aal' = 'aal2'`.
- Sign-ups disabled; members join by invitation.
- Only the publishable key reaches the browser. Secret keys, VAPID private key and similar live in
  Edge Function secrets or Vault.
- Storage: private bucket, short-lived signed URLs, object paths prefixed by `home_id` and covered by
  RLS.
- Migrations in `supabase/migrations`, RLS tests (pgTAP) in CI, TypeScript types generated from the
  schema.

### 7.4 Home → cloud sync

Home Assistant automations call an Edge Function (`ingest`) with a per-home key (stored hashed) to
append events and roll-ups. No extra service is required at first. Supabase never initiates a
connection into the home.

### 7.5 Authentication and offline

- App sign-in: Supabase Auth (email + password or magic link, TOTP MFA for admins).
- Device control: a Home Assistant user session on each device (Home Assistant's own OAuth flow,
  refresh token stored on the device, exactly like the official Home Assistant app). This is a user
  session, not a device secret, and it keeps control working without internet.
- Trade-off accepted: first launch on a device signs in twice. A local bridge can merge the two
  later without giving up offline control.

---

## 8. Integrations

| Area | Now | Target |
|---|---|---|
| Lighting | Simulated | Relay/dimmer modules in deep wall boxes (neutral available), Zigbee/Matter bulbs where needed, via HA |
| Blinds | Simulated | Motorised blinds wired per window, via HA |
| Climate | Simulated | Room sensors (Zigbee), heat source and ventilation over a local interface (Modbus) where available |
| Cameras | Eufy app during renovation, not integrated | Wired PoE cameras → go2rtc + Frigate → HA ([ADR-0005](../adr/0005-cameras-poe-frigate-eufy-interim.md)) |
| Music | Simulated player | Sonos + Spotify through Music Assistant ([ADR-0009](../adr/0009-music-assistant-sonos.md)) |
| Energy | Simulated | HAN port reader (ESPHome) + Nord Pool day-ahead prices (15-minute resolution) in SEK |
| Weather | Simulated | SMHI open data (forecast, radar) |
| Notifications | — | Web Push from an Edge Function; critical alerts also through the Home Assistant companion app |
| Remote access | — | Tailscale |
| AI | — | Optional later, through a gateway with an allow-list of actions; never critical actions without human confirmation |

Rule for purchases: prefer devices that work locally and report their state. A device that needs the
manufacturer's cloud is documented as such before it is bought.

---

## 9. Design language: "Skymning"

Skymning is Swedish for dusk: the hour when the house lights come on. The interface should feel like
the house at that hour: dark, calm, and lit only where something is happening.

The explicit goal is an interface that does **not** look like a generic AI-generated dashboard: no
purple-blue gradients, no glowing blobs, no gradient text, no emoji, no identical rounded cards with
soft shadows, no decorative motion.

### 9.1 Principles

1. **The house is the interface.** The hero view or 3D model owns the stage. Chrome is quiet and
   recedes.
2. **Colour only carries meaning.** Neutral ink and graphite with a slight blue bias form the base.
   Accents are semantic:
   - *Ember* (warm amber): light on, something active.
   - *Frost* (cool cyan): climate, air, measurements.
   - *Signal* (red): alarm, critical failure.
   - *Moss* (green): secure, healthy, used sparingly.
   At night with everything off, the screen is almost monochrome. Turning on a lamp literally warms
   the UI and the model in the same colour.
3. **Typography does the hierarchy.** One characterful grotesk family (*Schibsted Grotesk*,
   variable, designed for a Scandinavian media group) with tabular figures. Readings such as 21.5° or
   1.8 kW are set large and light; labels are small, uppercase, tracked. A short, strict type scale.
4. **Precise, flat surfaces.** Hairline borders, a three-step radius scale, no soft drop shadows.
   Background blur only on panels that float over the 3D stage, with a solid fallback in wall-panel
   mode for performance.
5. **Motion is state.** Every animation reports a change: spring physics while dragging, a pending
   pulse, a settle on confirmation, lamps fading in on the model as the UI confirms. No looping
   ambient animation. `prefers-reduced-motion` respected everywhere.
6. **Direct manipulation.** Cards are controls: drag across a light card to dim, drag a blind card to
   set its position, tap to toggle, open details with a long press or the detail affordance.
7. **Readable from three metres.** On the wall panel, state is conveyed by colour, shape and position
   before text.
8. **Own iconography.** A custom device icon set drawn on one grid (24 px, 1.5 px stroke). Generic UI
   glyphs come from Lucide.

### 9.2 Layouts per screen class

| Screen | Layout |
|---|---|
| Desktop / laptop | Top bar (time, weather, connection, security, alerts) · category chips · central stage (hero/3D) with view switcher (Front, Garden, 3D) · right column (rooms, room detail) · bottom widget row (energy, music, scenes) |
| iPad wall panel | Full screen, larger touch targets (≥ 56 px), stage plus quick scenes, returns to home after inactivity, dims at night, resyncs on wake |
| iPhone | Bottom navigation (Home, Rooms, Cameras, More), stage as a swipeable header, rooms as stacked sections, controls in bottom sheets |

### 9.3 Inspiration

Two reference screenshots supplied by the owner (not stored in this repository) show a dark dashboard
with a diorama-style house floating on a dark stage, round markers on the model, category chips with
status, a rooms column and widget tiles. We keep that structure and the "island" presentation, and
replace the generic look with the Skymning language above.

---

## 10. Platform notes

### 10.1 iPad wall panel

- Start: Home Screen web app (standalone), Auto-Lock "Never", Guided Access.
- Limits: Guided Access does not survive a restart; a web app cannot auto-launch after reboot or set
  screen brightness; the Wake Lock API is tested on the device but not relied on.
- Fallback if needed: a kiosk browser app or a thin Capacitor wrapper of the same code (auto-launch
  through Single App Mode on a supervised iPad, brightness control). Requires the Apple Developer
  Program.
- Hardware: an LCD iPad (not an OLED iPad Pro, because of burn-in from a static UI), powered by
  PoE→USB-C from the UPS-backed cabinet, charge kept between 40 % and 80 % by an automation,
  ventilated recess.

### 10.2 iPhone

Installable PWA, safe-area aware, gestures, Web Push for Home Screen web apps, passkey for critical
actions.

---

## 11. Hosting and delivery ([ADR-0006](../adr/0006-hosting-pages-demo-live-home-server.md))

- **Demo**: GitHub Pages, deployed by GitHub Actions on every merge to `main`, with `config.json`
  set to demo mode. Base path comes from configuration, so a custom domain is a one-line change.
- **Live**: the same build served by Caddy on the home server; reachable on the LAN and over
  Tailscale only. The server pulls released artefacts; nothing is exposed to the internet.
- **Repository going private later**: history, Actions and secrets are kept. GitHub Pages from a
  private repository needs a paid plan and the site stays public, so the public demo either stays on
  Pages (Pro plan) or moves to a separate public demo repository. Private previews, if wanted, go to
  Cloudflare Pages behind Cloudflare Access.
- **Routing**: History API with `basename` from configuration and a `404.html` fallback on Pages.

---

## 12. Technology stack

Versions checked on 2026-10-22.

| Area | Choice |
|---|---|
| Language | TypeScript 6.0 (strict). TypeScript 7 is released, but `typescript-eslint` supports `< 6.1`. ([ADR-0008](../adr/0008-typescript-6-until-ecosystem-ready.md)) |
| UI | React 19.3 |
| Build | Vite 8, `@vitejs/plugin-react` 6 |
| Styling | Tailwind CSS 4.3 with design tokens as CSS variables |
| Components | shadcn/ui pattern (components live in the repo) on Base UI 1.x primitives (Radix as fallback) |
| Motion | Motion 14 |
| 3D | three 0.186, @react-three/fiber 9.8 (requires React < 19.4), @react-three/drei 10.7 |
| State | Zustand 5, TanStack Query 5 |
| Routing | React Router 8 |
| Validation | Zod 4 |
| PWA | vite-plugin-pwa 2 (Workbox) |
| Home Assistant | home-assistant-js-websocket 9.7 |
| Backend | @supabase/supabase-js 2, Supabase CLI |
| Fonts | Schibsted Grotesk (variable), self-hosted via Fontsource |
| Quality | ESLint 10 + typescript-eslint 8, Prettier 3, Vitest 5, Testing Library, Playwright 1.64 |
| Workspace | pnpm workspaces, Node 24 LTS |

Upgrade policy: Dependabot weekly; majors upgraded deliberately with a note in the changelog or an ADR
when they affect architecture.

---

## 13. Repository layout

```
apps/web/              React application
packages/domain/       shared types, capability and command model, Zod schemas, pure logic
supabase/              migrations, Edge Functions, RLS tests
tools/3d/              model pipeline: optimisation, variants, validation, demo house generator
docs/                  specs, ADRs, guides
.github/workflows/     ci.yml, deploy-pages.yml
CLAUDE.md              guide for Claude sessions
README.md
```

---

## 14. Quality and testing

- **Unit** (Vitest): domain logic, command tracker, simulator, bindings, schema validation.
- **Component** (Vitest + Testing Library): cards and controls, including pending/failed states.
- **Integration**: gateways against recorded Home Assistant messages; RLS tests with pgTAP.
- **E2E** (Playwright, profiles iPhone, iPad, desktop; Chromium and WebKit): turn on a light
  (pending → confirmed), injected failure (revert + message), set a blind to 40 %, switch rooms, tap a
  3D marker to open its controls, install manifest present.
- **Budgets in CI**: initial JS ≤ 250 KB gzip; demo GLB ≤ 3 MB; no secrets (gitleaks).
- CI runs on every pull request; `main` is protected and requires green CI.

---

## 15. Roadmap

| Stage | Scope | Done when |
|---|---|---|
| **E0 Decisions** | This spec, ADRs, CLAUDE.md, README | Owner approves the spec |
| **E1 Foundation** | Workspace, toolchain, tokens and primitives, four layout shells, PWA, CI, Pages deploy, runtime config | Every merge deploys automatically; installs as PWA on iPhone and iPad; CI green |
| **E2 Demo home + 3D v1 (MVP)** | Domain package, simulator, command tracker; dashboard with header, category chips, rooms, device cards (light, blind, thermostat, sensors, camera placeholder, music), scenes; 3D v1 with a generic demo house GLB generated by a script that follows the real naming convention, orbit/zoom, view presets, floors, roof toggle, clickable markers, light and blind state on the model | E2E scenarios pass; budgets met; smooth orbit on iPad; no secrets |
| **E3 Full 3D** | Hero views with light layers, day/night, quality tiers, KTX2/Meshopt pipeline, binding registry, room temperature, model validator, Blender starter file | Swapping the GLB needs no code change; ~60 fps iPad, ≥ 30 fps iPhone |
| **M Owner's house model** (parallel) | Measurements → Blender → pipeline → private Storage | Passes the validator and budgets |
| **E4 Supabase** | Project, migrations, RLS + tests, Auth + MFA, invitations, Storage, offline cache, placement editor | Config loads from the database; RLS tests prove role isolation; app starts offline from cache |
| **R Installation** (parallel, renovation-driven) | Point plan, electrician brief, buy-now/buy-later list (kept private, outside this repo) | Delivered before walls close |
| **E5 Home Assistant** | Test kit, then production; Tailscale; HTTPS; Home Assistant gateway; live build served from home | Real lamp controlled with confirmation; physical change visible < 1 s; works with internet unplugged |
| **E6 Cameras** | PoE + VLAN, go2rtc + Frigate, grid, full screen, event timeline, open from 3D, notifications | < 1 s to first frame locally; works over Tailscale; no public streams |
| **E7 Advanced** | Scene and automation authoring (Home Assistant as engine), energy (HAN, Nord Pool, SEK), music, statistics, optional AI | Per feature spec |
| **E8 Production** | Private repository, wall panel kiosk, backups (3-2-1), monitoring, runbooks, failure drills | Passes drills: no internet, server restart, power cut on UPS |

The MVP is **E1 + E2**: the first version on GitHub Pages that the owner opens on iPhone and iPad.

---

## 16. Open questions

1. Location of the main electrical panel and the internet entry point (affects the cabinet location).
2. Street side, driveway and garage door orientation (affects cameras and the hero views).
3. Heating source and ventilation system (affects integrations and purchases).
4. Which rooms get in-ceiling speakers and which get standalone Sonos speakers.
5. Whether the household needs a certified, monitored alarm (affects the security architecture).
6. Household members and interface languages (Polish first; Swedish and English later?).
7. Whether to rename the repository to a neutral name.
