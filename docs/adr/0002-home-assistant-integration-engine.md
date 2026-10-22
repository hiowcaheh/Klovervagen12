# ADR-0002: Home Assistant as the integration engine

- Status: Proposed
- Date: 2026-10-22

## Context

The house will mix Zigbee, Thread/Matter, Wi-Fi, Modbus and some cloud devices from different
manufacturers. A custom local integration server was considered.

## Decision

- Home Assistant runs on the home server as the integration and automation engine and the source of
  truth for device state. Its own dashboard is not the product UI.
- The app talks to Home Assistant through its WebSocket API using the official
  `home-assistant-js-websocket` library, behind the `DeviceGateway` port.
- No custom integration server is built now. One is added only for a concrete need: per-device
  permissions for guests, an AI action gateway with an allow-list, or integrations Home Assistant
  cannot serve.

## Consequences

- Hundreds of integrations are available without our code.
- Our domain model maps Home Assistant entities to capabilities in the gateway adapter.
- Home Assistant permissions are coarse (admin / non-admin); fine-grained rules wait for the bridge.
- Prefer devices with local APIs and state reporting.
