# ADR-0008: TypeScript 6.0 until the lint ecosystem supports 7

- Status: Proposed
- Date: 2026-10-22

## Context

TypeScript 7 (native compiler) is released (7.0.2, July 2026). `typescript-eslint` 8.72 declares
`typescript >=4.8.4 <6.1.0` as its peer range.

## Decision

Use TypeScript 6.0.x with `strict` and related flags. Revisit when `typescript-eslint` supports 7.

## Consequences

- Type-aware lint rules keep working.
- Slower type checking than TypeScript 7 until the switch; acceptable at this project size.
