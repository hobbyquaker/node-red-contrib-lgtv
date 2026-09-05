# Agent Instructions

Instructions for AI coding agents (Claude Code, etc.) working in this repository.

## Project overview

`node-red-contrib-lgtv` provides Node-RED nodes to control LG webOS smart TVs
over their SSAP websocket API. All TV communication goes through the
[lgtv2](https://github.com/hobbyquaker/lgtv2) module (same author, checked out
next to this repo as `../lgtv2` on the maintainer's machine); this package only
contains the Node-RED glue.

Layout:

- `nodes/` — one `.js` (runtime) + `.html` (editor UI, help text) pair per node
  type; `nodes/icons/` holds the palette icons. `lgtv-config.js` owns the single
  lgtv2 connection per TV, fans out subscriptions to the other nodes and serves
  the editor's pairing endpoint (`GET /lgtv-connect`).
- `test/` — `node:test` specs run through `node-red-node-test-helper`;
  `test/mock-tv.js` is an in-process mock of the TV's websocket API (adapted
  from lgtv2's own test suite).
- `.github/` — CI (lint + tests on Node 22/24 × Node-RED 4/5) and the release
  workflow (npm publish via OIDC trusted publishing on `v*` tags, GitHub
  release with notes from `CHANGELOG.md` via `.github/release-notes.js`).

## Conventions

- Code style: ESLint 10 (flat config, `eslint.config.js`) + Prettier
  (`.prettierrc`, 4-space, 120 cols). `npm run lint` checks both,
  `npm run format` auto-fixes. Let a failing lint stop you.
- Tests: `npm run test:unit` (node:test against the mock TV);
  `npm test` = lint + tests. Nothing here talks to a real TV; behaviour that
  depends on real firmware is marked as unverified in the changelog until
  someone confirms it on hardware.
- Stay CommonJS. lgtv2 >= 2.0 is an ES module and is loaded with
  `require('lgtv2')` (require(esm), hence the Node >= 20.19 floor).
- Each node's `.js` and `.html` must stay in sync (type name, defaults, help
  text). Config node fields are read by the editor's Connect button too
  (`lgtv-config.html` → `/lgtv-connect` query parameters).
- Versioning during development: `2.0.0-dev.0`, `2.0.0-dev.1`, … bumped in the
  commit that makes a significant change; the release workflow publishes
  pre-release versions under the npm `next` dist-tag and tags them as GitHub
  pre-releases.
- `CHANGELOG.md` follows Keep a Changelog; write the user-visible symptom and
  reference the issues/PRs a change addresses.
- Avoid breaking changes to node config schemas without a migration path for
  existing flows; stored credentials (the pairing token) must keep working.

## Working here

- Always run commands through WSL (Debian), never PowerShell/cmd, to avoid
  CRLF/BOM/file-mode problems. Work from `~/repos/node-red-contrib-lgtv`.
- Supported floors: Node.js ^20.19 || ^22.12 || >=24, Node-RED >= 4.0; the
  primary target is Node-RED 5 on Node 24.
- When answering GitHub issues or pull requests on behalf of the maintainer,
  end the comment with a footer stating that it was written by an AI agent on
  behalf of @hobbyquaker.
