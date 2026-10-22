# Home OS

A custom smart home platform built around an interactive 3D model of the house.

- **Local-first**: devices are controlled through Home Assistant on the home network and keep working
  without internet.
- **One app** for iPhone, a wall-mounted iPad and desktop browsers (installable PWA).
- **Digital twin**: lights, blinds, openings, motion and offline devices are shown on the model.
- **Demo mode**: the public build runs entirely in the browser with simulated devices and a generic
  demo house.

> This repository contains code, demo data and generic documentation only. No private data about the
> real house is stored here.

## Status

Stage **E0**: architecture and specification under review. The first deployable version (E1 + E2) will
be published to GitHub Pages.

## Documentation

- [Platform design](docs/specs/2026-10-22-platform-design.md)
- [Architecture decisions](docs/adr/README.md)
- [Guide for Claude sessions](CLAUDE.md)

## Stack

React · TypeScript · Vite · Tailwind CSS · React Three Fiber · Zustand · TanStack Query · Supabase ·
Home Assistant
