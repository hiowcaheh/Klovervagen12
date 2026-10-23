# CLAUDE.md

Guide for Claude sessions working on this repository. Read it fully before changing anything.

## Project

Smart home for one real house in Sweden that is being renovated. Two parts:

1. **Current: installation planner** (`site/`). A static web page on GitHub Pages with a Supabase
   login (no sign-up). The owner places points on the floor plan (lights, LED 24 V, Shelly modules,
   cameras, sensors, Sonos, ...) and the page suggests the device, power supply, cabling, cost and a
   Swedish brief for the electrician. Devices will run in **Apple Home** (Hem): HomePod mini 2 as the
   hub, Shelly Gen4 (Matter), Aqara/Eve cameras (HomeKit Secure Video), IKEA Matter-over-Thread
   sensors, Sonos over AirPlay. See [ADR-0011](docs/adr/0011-apple-home-and-planner.md).
2. **On hold: Home OS platform** (custom React app with a 3D digital twin and Home Assistant).
   Design in [`docs/specs/2026-10-22-platform-design.md`](docs/specs/2026-10-22-platform-design.md)
   and ADR-0001…0010. Do not build it unless the owner asks.

## Working with the owner

- Communicate in **Polish**. Code, identifiers, comments, commits and docs are in English.
- The owner works mostly from an iPhone: short replies, outcome first, bullet points.
- Order of work: analyse → agree scope → implement → test → update docs → deploy.
- Verify current product facts and prices instead of guessing; say when a price is an estimate.
- Do not push to `main`, open pull requests or change repository settings unless the owner asks.

## Hard rules

1. **Privacy.** The repository and the Pages site are public. Never commit the address, property
   designation, floor plans, photos, camera or network placement, or the owner's e-mail. The floor
   plan geometry and Claude's suggestions live only in Supabase (`planner_config`), the allow-list in
   `planner_allowed_emails`. Generated seed files are named `*PRIVATE*` and are git-ignored.
2. **Keys.** Only the publishable key (`sb_publishable_...`) may appear in `site/config.js`. Never
   use, store or commit a `service_role` or secret key.
3. **Access is enforced in the database.** Every table has RLS; members are checked with
   `public.planner_is_member()`. The page never decides access on its own.
4. **Escape output.** All dynamic text inserted into HTML goes through `esc()` in `site/app.js`.

## Repository layout

```
site/                       static site deployed to GitHub Pages (no build step)
  index.html                login view + planner view
  styles.css                design tokens and layout (light and dark)
  config.js                 Supabase URL + publishable key (public by design)
  catalog.js                generic catalog of point types: devices, needs, tips, prices, Swedish lines
  app.js                    auth, data access, plan rendering, editor, generated lists
  vendor/                   supabase-js 2.117.3 UMD build (MIT)
supabase/migrations/        database schema (no private data)
.github/workflows/          deploy-pages.yml (push to main touching site/** → Pages)
docs/                       specs and ADRs
```

## Supabase

- Project ref `mcdfacpdmvobaeinjncm`, URL `https://mcdfacpdmvobaeinjncm.supabase.co`. It lives in a
  separate Supabase organization from the owner's other projects; never mix data with those.
- Tables: `planner_allowed_emails` (email, optional `user_id` pin), `planner_points` (owner's points),
  `planner_config` (`floorplan`, `suggestions` JSON). Schema in `supabase/migrations/`.
- Sign-ups are disabled in Auth settings; the owner's account is created in the dashboard.
- Schema changes: add a new migration file, apply it with the Supabase MCP `apply_migration`, run
  `get_advisors` (security) afterwards.

## Running and testing

- No build and no npm dependencies. Preview locally: `python3 -m http.server -d site 8000`.
  The page needs the Supabase project to be reachable to log in.
- Before pushing a change to `site/`, run `node --check site/app.js` and exercise the flow in a
  browser (login, add point, edit, delete, logout). Cloud sessions may not reach Supabase; then test
  with a local test double of `window.supabase` and say that the real login was not exercised.
- RLS changes: test with a local Postgres and stub `auth` schema, or `execute_sql` with
  `set local role authenticated` and `request.jwt.claims`.

## Deployment

- Pages source is **GitHub Actions** (already set by the owner).
- A push to `main` that touches `site/**` deploys to https://hiowcaheh.github.io/Klovervagen12/
  in about 2 minutes.
