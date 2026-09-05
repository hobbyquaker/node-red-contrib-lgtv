# Changelog

Notable changes to node-red-contrib-lgtv. Format follows
[Keep a Changelog](https://keepachangelog.com/); entries describe the
user-visible symptom and the cause, not the commit list (the release notes
append commits automatically).

## 2.0.0 (unreleased)

Modernization release. Requires Node.js ^20.19 || ^22.12 || >=24 and
Node-RED >= 4.0 (primary target: Node-RED 5 on Node 24). Existing flows and
stored tokens keep working; the config node has three new optional fields.

### Changed (breaking)

- **lgtv2 2.0.1** (was 1.4): transport is `ws` instead of the unmaintained
  `websocket` package, so nothing native is compiled on install any more (the
  install failures on Raspberry Pi, Home Assistant OS and in Docker were all
  the `bufferutil`/`utf-8-validate` build). (#27, #30, #32, #33, #35, #37,
  #54, #62, #64)
- The connection is made with `{host}`: `wss://<host>:3001` is tried first
  and `ws://<host>:3000` second, whichever works is kept. TVs from 2023 on
  only accept the secure port and could not be paired at all with 1.x.
  (#56, #57, #58, #61, #63, PR #59)
- The control node's `turnOn` sends Wake-on-LAN magic packets instead of a
  request the TV never answered (`ssap://system/turnOn` does not exist and
  the TV is unreachable while off). The MAC addresses are learned from the
  TV after the first connection; the config node also has a MAC field.
  (#4, #9)
- Failed requests are reported through `node.error(err, msg)` and thereby
  reach catch nodes; the request node no longer stays silent on failures
  (`ESSAP` errors from the TV carry `errorCode`/`errorText`). (#18)
- The toast node uses `ssap://system.notifications/createToast` (was the
  legacy `palm://` scheme).
- Node-RED < 4 and Node.js < 20.19 are no longer supported.

### Added

- Config node: **connection** (auto / wss / ws) and **port** to pin the
  websocket endpoint, e.g. behind port forwarding.
- Toast icons: `msg.iconData` (base64 string or Buffer) and
  `msg.iconExtension` (default `png`). (#22, #39)
- Control node: `turnOnScreen` / `turnOffScreen`.
- YouTube node accepts a full video URL as well as a video id. (#40)
- Channel node: a numeric `msg.payload` switches by channel number, a
  string is still treated as `channelId`. (#60)
- Test suite against an in-process mock TV, GitHub Actions CI on Node
  22/24 with Node-RED 4/5, releases published to npm via OIDC trusted
  publishing.

### Fixed

- Crash `Cannot read property 'indexOf' of undefined` from the volume and
  mute nodes on newer firmware: lgtv2 now normalizes the `volumeStatus`
  payload of webOS 6+ to `volume`/`muted`/`changed`. (#36, #45, #51,
  PRs #48, #52, #53)
- Duplicate messages from the control node after partial deploys: the
  `tvconnect`/`tvclose` listeners are removed when a node is closed, and the
  config node disconnects from the TV on close instead of leaking a
  reconnecting connection per deploy. (#29)
- The button node ignored the digit `0`. (#44)
- The mouse node's `scroll` topic was documented but not implemented.
- The editor's Connect button kept its state in module globals shared by
  all config nodes; pairing is now tracked per config node.
- Nodes show the connection status immediately after a deploy, not only
  after the next status change.

## 1.1.0 (2019-04-14)

- Last 1.x release: lgtv2 1.4, xo linting.
