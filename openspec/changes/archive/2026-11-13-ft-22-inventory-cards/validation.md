# FT-22 validation — 13 ноября 2026

- OpenSpec proposal, design, delta requirements and tasks prepared against the implemented and owner-approved behavior. Strict change validation passed.
- npm test: 38/38 passed, including coverage of all 127 official RU names and preserved EN names.
- Catalog checker: no structural errors; existing incomplete farming-location/relic-source warnings remain informational.
- Internal browser: earlier validation covered quick steps, clamp at zero, custom addition/subtraction, exact editing, undo, persistence and English-name search in RU.
- Release audit found and fixed inability to clear inline stock. Retested: save empty field displays unknown and an em-dash shortfall; Undo restores the previous quantity; Escape discards an edited quantity.
- 360-pixel viewport: all card controls and shortfall reachable; document scroll width equals client width (345 CSS pixels excluding scrollbar), no horizontal overflow. Desktop square card presentation was checked in the same internal browser.
- npm run build:win: built version 1.8.0. npm run test:win: passed; app.js, style.css, i18n.js and catalog.json compared byte-for-byte with bundled assets. Save/conflict/restart/fallback port/moved EXE verified by the portable smoke check.
- No progress schema or resource-ID changes; executable remains unsigned as in previous releases.

Release publication and download: [v1.8.0](../../../../releases/v1.8.0.md).

Full strict OpenSpec validation also found four pre-existing missing Purpose sections in FT-20/21/24/27 specifications. These sections were added without changing their requirements; all 16 main specifications then passed.
