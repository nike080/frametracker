# Validation — 2026-11-13

## Automated

- `npm test`: 25/25 passed, including stable theme ids, malformed preference fallback, 23 palette identities and WCAG 4.5:1 checks for body, muted and accent text against both primary surfaces.
- `node --check public/app.js`, `public/themes.js`, `server.cjs`: passed.
- `git diff --check`: passed (existing Windows LF/CRLF conversion warning only).
- `openspec validate orokin-faction-redesign --strict --no-interactive`: passed before archival.
- `npm run build:win`: built local `dist/FrameTracker.exe`, version 1.5.0. The injector reports its customary copied-Node signature warning; executable behavior is verified by the smoke check, not by a signing claim.
- `npm run test:win`: passed in an isolated profile. Covered embedded catalog and faction assets, progress save/conflict, duplicate launch, fallback port, relocated executable and process cleanup.

## Browser

Started with `PORT=4190 npm start -- --no-browser`. Confirmed Settings in the internal browser once the test server was reachable. Automated checks used a fresh local Edge context with deterministic availability/price fixtures and no user's progress data.

- All 23 themes and 23 distinct mottos, retained theme after reload and language changes.
- RU/EN on all five routes at 360, 768 and 1440 pixels; no page-level horizontal overflow.
- Settings is the only place with manual online refresh buttons. Both individual and batch prices update their status.
- Catalog search retained after Equinox details; goal activation still produces a goal plan. Native dialog opens/closes and provides component controls.
- Inspected desktop, settings and narrow catalog images. Corrected leftover green filter surfaces and dark-only Prime backgrounds; palette surfaces now use theme tokens. Hover/motion obey reduced-motion rules.
- Missing portrait images retain the existing app-mark fallback. External portraits are lazy loaded, so full-page screenshots are not a claim that every remote image was downloaded.

## Limits

No full screen-reader, physical-touch or 200% zoom audit. Online fixtures verify relocated controls, not current upstream relic/price accuracy. Unit tests cover invalid appearance ids; a full browser-storage-denial scenario was not performed. Existing unknown-stock, undo, catalog and availability tests passed unchanged.

## Scope of authorization

The user approved the design and explicitly requested a dedicated branch, PR, spec synchronization/archival and local distribution rebuild. Main is not merged and no release is published.
