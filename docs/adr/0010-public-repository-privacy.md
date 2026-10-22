# ADR-0010: Privacy rules for the public repository

- Status: Proposed
- Date: 2026-10-22

## Context

The repository is public so that GitHub Pages is free. It will later become private. The platform
manages a real house; floor plans, camera positions and network details are security-sensitive.

## Decision

The repository never contains:

- the house address, property designation, coordinates or photos;
- floor plans, the real 3D model or hero renders of the real house;
- camera, sensor or network placement of the real house; internal hostnames or IP addresses;
- tokens, keys, passwords, VAPID private keys, Home Assistant tokens;
- personal data of household members.

Private material lives in private Supabase Storage or private documents. CI runs secret scanning
(gitleaks) and GitHub push protection is enabled. Commits use a no-reply email address.

## Consequences

- Demo data is generic and clearly fictional.
- Reviews check new files against this list.
- The repository name itself should be neutral; renaming is recommended to the owner.
