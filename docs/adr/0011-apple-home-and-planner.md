# ADR-0011: Apple Home for devices; installation planner on GitHub Pages with Supabase login

- Status: Accepted
- Date: 2026-10-23
- Supersedes for now: ADR-0001…0010 (put on hold)

## Context

The custom platform (ADR-0001…0010) was judged too complex and too expensive for the owner's needs
(estimated 180–360 thousand SEK of hardware and infrastructure). The house is being renovated now, so
the urgent value is a good installation plan for the electrician. The owner uses an iPhone and wants
wireless devices controlled from Apple's Home app.

## Decision

- Devices run in **Apple Home**: HomePod mini 2 as the home hub; Shelly Gen4 modules (Matter) behind
  existing switches and for 24 V LED (Shelly Dimmer 0/1-10V PM Gen4 with 0-10V drivers); Aqara G5 Pro,
  Eve Outdoor Cam and Aqara G410 doorbell (HomeKit Secure Video); IKEA Matter-over-Thread sensors;
  Sonos over AirPlay. Eufy stays standalone during the renovation.
- The **installation planner** is a static page (`site/`) on GitHub Pages: vanilla JavaScript, no
  build step, supabase-js vendored.
- **Supabase** provides login without sign-up and stores the points. Access is an e-mail allow-list
  checked by RLS (`planner_is_member()`), optionally pinned to the account id.
- The floor plan geometry and suggestions are private data stored in `planner_config`, never in the
  repository; the public site contains only the generic editor and catalog.

## Consequences

- Hardware budget drops to roughly 20–60 thousand SEK; no server, VLANs or custom integrations.
- The planner works from any device after login; data is shared between phone and computer.
- Matter devices can later be added to Home Assistant if the custom platform is resumed.
- Only generic code and catalog data are public; everything about the house stays in Supabase.
