# ADR-0004: Blender model as source of truth; hero renders plus real-time 3D

- Status: Proposed
- Date: 2026-10-22

## Context

The central feature is a realistic, interactive model of the real house that reflects device state.
Options compared: photogrammetry, LiDAR, Gaussian splatting, NeRF, a hand-built Blender model.
Scans look photoreal but are a single baked surface: no separate windows, blinds or lamps, baked
shadows (no night mode), heavy for phones. The owner's inspiration screenshots show photoreal hero
views of a diorama-style house with markers, plus a separate 3D view.

## Decision

- The house is modelled in Blender from drawings, measurements, LiDAR scans and photos. Scans are
  reference material.
- Strict node naming (`floor:`, `room:`, `roof`, `window:`, `door:`, `blind:`, `lamp:`, `anchor:`,
  `camera:`) and custom properties exported as glTF `extras`.
- Two presentations from the same model:
  1. Hero views: pre-rendered day/night images from fixed cameras, with one light layer per lighting
     group composited in the browser by real brightness, plus markers at projected anchors.
  2. Real-time 3D: optimised GLB (Meshopt, KTX2, three quality variants) in React Three Fiber with
     on-demand rendering.
- Device placements and visual bindings are data (`device_placements`); bindings are a registry of
  small modules keyed by kind.

## Consequences

- Photoreal look at low runtime cost on phones and the wall panel.
- Twin states (lights, blinds, openings, motion, offline) are possible because objects are separate.
- Modelling effort is the largest single task; the pipeline and conventions make it delegable to a
  3D artist.
- Hero views need re-rendering when the model or a lighting group changes.
