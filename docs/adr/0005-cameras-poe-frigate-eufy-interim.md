# ADR-0005: Wired PoE cameras with go2rtc and Frigate; Eufy only during renovation

- Status: Proposed
- Date: 2026-10-22

## Context

Eufy was considered. As of October 2026: no official public API, no ONVIF, RTSP only on some
models, battery models cannot stream continuously. The community libraries
`bropat/eufy-security-client` and `bropat/eufy-security-ws` were archived on 2026-09-12;
`fuatakgun/eufy_security` announced it will not be updated; the successor (`mega-yfue/eufy-sdk`) is
independent, unofficial and works through the Eufy cloud account. The owner needs cameras during
the renovation and has no wired option yet.

## Decision

- During renovation: Eufy cameras used through the Eufy app, not integrated into the platform.
- Target: wired PoE cameras with RTSP/ONVIF (candidates: Reolink, UniFi Protect, Axis), in a camera
  VLAN without internet access, streamed through go2rtc (WebRTC) and recorded by Frigate, surfaced
  through Home Assistant.
- Cat6A runs to all target camera positions are installed during the renovation.
- The app accesses cameras only through `CameraGateway`, so the provider can change without UI work.

## Consequences

- Sub-second local video, continuous recording, multi-camera grid on the wall panel.
- No camera stream is reachable from the internet; remote viewing goes through Tailscale.
- Eufy devices can be reused later for spots without cable, integrated best-effort if at all.
- Camera placement must respect Swedish camera surveillance rules (no public areas or neighbours
  without justification; privacy masks).
