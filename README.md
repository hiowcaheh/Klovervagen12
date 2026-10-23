# Smart Home planner

A small web page for planning a smart home during a renovation: place points on the floor plan and
get the device, power supply, cabling, cost estimate and a brief for the electrician. Devices are
planned for Apple Home (Matter and HomeKit).

- **Live page:** https://hiowcaheh.github.io/Klovervagen12/ (login required, no sign-up)
- **Code:** `site/` (static, no build step), database schema in `supabase/migrations/`
- **Decisions:** [docs/adr](docs/adr/README.md); the earlier custom platform design is on hold in
  [docs/specs](docs/specs/2026-10-22-platform-design.md)
- **For Claude sessions:** [CLAUDE.md](CLAUDE.md)

> The repository is public. It contains generic code only; the floor plan and all planning data are
> stored in Supabase and readable only after login.
