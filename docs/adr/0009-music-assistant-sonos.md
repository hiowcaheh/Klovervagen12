# ADR-0009: Sonos and Spotify through Music Assistant

- Status: Proposed
- Date: 2026-10-22

## Context

The owner wants speakers (Sonos) and Spotify inside the app. Since February 2026 Spotify's Web API
development mode requires Premium, allows one client ID per developer and up to five users, with a
reduced endpoint set. Sonos is a Spotify Connect device and is not controllable through Home
Assistant's Spotify integration directly.

## Decision

- Music Assistant runs next to Home Assistant and owns music sources (Spotify, Premium required) and
  players (Sonos), queues and grouping.
- The app controls music through the `MusicGateway` port, backed by Home Assistant / Music Assistant.
  Spotify credentials stay on the server.
- The Spotify app on phones keeps working through Spotify Connect.
- Speaker zones are planned during the renovation (in-ceiling speakers on Sonos Amp in the cabinet,
  standalone speakers or soundbars elsewhere). Synchronised multi-room playback assumes one
  ecosystem (Sonos).

## Consequences

- No Spotify tokens in the browser, no dependency on Spotify's developer quota.
- Music features depend on Music Assistant releases; the gateway isolates the UI from that.
