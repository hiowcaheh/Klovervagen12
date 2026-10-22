# CLAUDE.md

Guide for Claude sessions working on this repository. Read it fully before changing anything.

## Project

**Home OS**: a custom smart home platform for one real house in Sweden. A web app (PWA) for iPhone,
a wall-mounted iPad and desktop, built around an interactive 3D model of the house that acts as a
simplified digital twin. Home Assistant runs the devices locally; Supabase holds configuration,
identity and history.

- Full design: [`docs/specs/2026-10-22-platform-design.md`](docs/specs/2026-10-22-platform-design.md)
- Decisions: [`docs/adr/`](docs/adr/README.md)
- Current stage: **E0 (spec under review)**. Next: E1 Foundation, E2 Demo home + 3D v1 (the MVP).

## Working with the owner

- Communicate with the owner in **Polish**. Code, identifiers, comments, commits and docs are in
  English.
- The owner often works from a phone: keep replies short, lead with the outcome, use bullet points.
- Work in this order: analyse → choose → agree scope → implement → test → update docs → deploy.
- Push back with reasons when a better option exists. Verify current library versions and
  integration status instead of guessing.
- Before large changes, state the impact on other modules. Record architectural decisions as ADRs.
- Do not open pull requests, push to `main`, or change repository settings unless the owner asks.

## Hard rules

1. **Privacy (public repository).** Never commit the address, property designation, coordinates,
   floor plans, photos, the real 3D model, camera/network placement, hostnames, IPs or any secret.
   See [ADR-0010](docs/adr/0010-public-repository-privacy.md). Demo data is generic and fictional.
2. **No secrets in the browser bundle.** Environment specifics come from runtime `config.json`
   ([ADR-0007](docs/adr/0007-runtime-config-single-build.md)). Only the Supabase publishable key may
   reach the browser.
3. **Local-first control.** Device commands never go through Supabase or any cloud
   ([ADR-0001](docs/adr/0001-local-first-control-plane.md)).
4. **Honest state.** A command is pending until the device reports the target state. Never render an
   unconfirmed or stale value as current.
5. **Critical actions** (unlock, disarm, open garage door) require confirmation plus PIN/passkey and
   are audited. AI features may never execute them without human confirmation.

## Architecture in one screen

```
features  →  stores  →  ports (packages/domain)  ←  gateways (demo | homeassistant | supabase)
scene3d   →  stores (selectors)                       ui (design system) used by features/layouts
```

- Ports: `DeviceGateway`, `ConfigRepository`, `CameraGateway`, `MusicGateway`.
- The demo adapter is a real simulator (latency, failure injection). It powers the public demo and
  the tests. It is not throwaway code.
- UI chooses controls by **capability** (`onOff`, `brightness`, `coverPosition`, ...), never by brand.
- 3D: devices are bound to the model through data (`device_placements`) and a registry of visual
  binding modules (`light-glow`, `cover-position`, `opening-indicator`, ...).

## Stack

TypeScript 6.0 (strict) · React 19.3 · Vite 8 · Tailwind CSS 4.3 · shadcn/ui pattern on Base UI ·
Motion 14 · three 0.186 + @react-three/fiber 9.8 + drei 10.7 · Zustand 5 · TanStack Query 5 ·
React Router 8 · Zod 4 · vite-plugin-pwa 2 · home-assistant-js-websocket 9.7 · supabase-js 2 ·
Vitest 5 · Playwright 1.64 · ESLint 10 + typescript-eslint 8 · Prettier 3 · pnpm · Node 24 LTS.

Compatibility notes:
- `typescript-eslint` supports TypeScript `< 6.1`; do not upgrade to TypeScript 7 yet
  ([ADR-0008](docs/adr/0008-typescript-6-until-ecosystem-ready.md)).
- `@react-three/fiber` 9.8 requires React `< 19.4`.

## Repository layout (target, created in E1)

```
apps/web/src/
  app/        bootstrap, providers, router, runtime config
  gateways/   demo/ · homeassistant/ · supabase/
  stores/     live device state, command tracker, UI state
  features/   dashboard, rooms, devices, cameras, scenes, music, energy, settings
  scene3d/    viewer, model loading, anchors, markers, bindings/
  ui/         tokens, primitives, motion presets, icons
  layouts/    phone · tablet · desktop · wall
packages/domain/   types, capabilities, commands, Zod schemas, pure logic (no React, no I/O)
supabase/          migrations · functions · tests (pgTAP)
tools/3d/          GLB pipeline, validator, demo house generator
docs/              specs · adr · guides
```

## Conventions

- **Files**: React components `PascalCase.tsx`; everything else `kebab-case.ts`. One component per
  file. Co-locate tests as `*.test.ts(x)`.
- **Naming**: types and components `PascalCase`; functions, variables, hooks `camelCase` (hooks start
  with `use`); constants `SCREAMING_SNAKE_CASE` only for true constants; database `snake_case`.
- **TypeScript**: `strict`, no `any` (use `unknown` + narrowing), no non-null assertions outside
  tests, exhaustive `switch` over unions.
- **Boundaries**: validate every external input (config, Supabase rows, Home Assistant messages) with
  Zod schemas from `packages/domain`.
- **Components**: small and focused; logic lives in hooks, stores or `packages/domain`, not in JSX.
  No component over ~200 lines without a reason.
- **Errors**: typed results at gateway boundaries; user-facing messages say what happened and what to
  do; no silent catches.
- **Styling**: only design tokens (CSS variables via Tailwind theme). No literal colours in
  components. Follow the "Skymning" design language (spec §9): colour carries meaning, typography
  leads, flat precise surfaces, motion only for state changes, no generic AI-dashboard look.
- **Commits**: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`),
  small and focused.

## Commands

Not available yet. The toolchain lands in E1; this section will list install, dev, lint, typecheck,
test, e2e and build commands then.

## Testing

- Unit and component tests with Vitest + Testing Library for domain logic, stores, simulator and
  controls (including pending/failed states).
- E2E with Playwright on iPhone, iPad and desktop profiles (Chromium + WebKit) for the key
  scenarios listed in spec §14.
- Budgets checked in CI: initial JS ≤ 250 KB gzip, demo GLB ≤ 3 MB, gitleaks clean.

## Deployment

- `main` is protected; CI must be green.
- Merge to `main` → GitHub Actions builds the demo and deploys to GitHub Pages
  (Settings → Pages → Source: GitHub Actions, set once by the owner).
- Live mode is served from the home server (later stage), never from Pages.

## Integrations (status)

| Integration | Status |
|---|---|
| Home Assistant | Planned (E5) |
| Supabase | Planned (E4); dedicated project in the Stockholm region |
| Cameras | Eufy used standalone during renovation; target PoE + go2rtc + Frigate (E6) |
| Music | Sonos + Spotify through Music Assistant (E7); simulated in the demo |
| Energy | HAN port reader + Nord Pool prices (E7); simulated in the demo |
| Weather | SMHI open data; simulated in the demo |

## Working from a phone (Claude Code on the web / mobile)

- Cloud sessions can read and change the repository, run tests and builds, take screenshots in
  Chromium, push branches and open pull requests when asked.
- Cloud sessions cannot reach the home network (Home Assistant, cameras). Work that needs it runs in
  a session on a computer at home (Claude Desktop or `claude remote-control`).
- After a merge to `main`, the demo on GitHub Pages updates in a few minutes.
