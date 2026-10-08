# Changelog

Notable changes to node-red-contrib-lgtv. Format follows
[Keep a Changelog](https://keepachangelog.com/); entries describe the
user-visible symptom and the cause, not the commit list (the release notes
append commits automatically).

## Unreleased

### Changed

- `msg.tv` (select the TV per message) works on every node with an input, not only on `control` and
  `request`. ([#65](https://github.com/hobbyquaker/node-red-contrib-lgtv/issues/65))

## 2.0.2 (2026-10-08)

### Fixed

- A `control`, `volume`, `mute`, `app` or `channel` node added to a flow while the TV was already
  connected stayed silent until the next change: the config node keeps one subscription per API
  endpoint and gave a node that subscribed later nothing, so of two nodes on the volume endpoint
  only the first saw the initial answer ("mute outputs, volume does not"), and the `control` node
  only reported `true`/`false` on a connection change. Nodes now get the current value when they
  are deployed, and the help texts say what each node outputs.
  ([#66](https://github.com/hobbyquaker/node-red-contrib-lgtv/issues/66), reported by
  @Jibun-no-Kage — thank you!)

### Added

- `control` node: a second output with the TV's power state as webOS reports it (`on`,
  `standby`, `screen_off`, `screen_saver`, `off`, `unknown`; `msg.raw` holds the unmapped
  answer), sent once after connecting and on every change. The subscription is only made when
  the output is wired. `screen_saver` and the updates the TV sends while powering down are
  unverified on hardware.
  ([#7](https://github.com/hobbyquaker/node-red-contrib-lgtv/issues/7), requested by @rcarmo
  and many others since 2018 — thank you!)
- `control` and `request` nodes: `msg.tv` selects the TV per message by the name, host or id of
  an _lgtv-config_ node, so one node can serve several TVs; an unknown name is an error on the
  node. ([#65](https://github.com/hobbyquaker/node-red-contrib-lgtv/issues/65), suggested by
  @Jibun-no-Kage — thank you!)

## 2.0.1 (2026-09-05)

### Fixed

- Remote buttons, pointer movement and scrolling did nothing after pairing
  with a webOS 26 TV; the pointer socket failed with
  `401 insufficient permissions`. lgtv2's unsigned fallback manifest lacked
  `CONTROL_INPUT_TEXT` and `CONTROL_MOUSE_AND_KEYBOARD`; fixed in lgtv2 2.0.2
  (lgtv2#52, thanks @Voodoo2man).

## 2.0.0 (2026-09-05)

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
