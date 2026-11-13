## Why

The approved Orokin Legacy mockup replaces the utilitarian green interface with a modern ivory/gold shell and expressive faction palettes. Collection workflows must remain intact; appearance and online maintenance must not occupy the catalog.

## What Changes

- Orokin shell, responsive sidebar, serif headings, architectural portraits, restrained hover motion and reduced-motion support.
- Settings route containing a single faction palette selector, relic and price refresh, per-Prime price requests, progress import/export and language.
- 23 curated palettes (Orokin plus 22 requested factions), each owning its light/dark surfaces, accents, emblem when available and original bilingual thematic motto.
- Stable local theme ids, safe fallback for invalid preferences and independent progress storage.
- Windows 1.5.0 build embeds all required styles and theme data.

## Capabilities

### New Capabilities
- `faction-appearance`: faction palettes, emblems, mottos and resilient appearance preference.

### Modified Capabilities
- `collection-interface`: Settings consolidates maintenance actions while preserving collection workflows.
- `app-distribution`: portable build includes the new UI assets.

## Impact

Changes presentation and control placement, not recipes, goals, progress schema or price/availability semantics. Emblems are embedded from existing public Warframe Wiki assets; other themes use the app mark. No new runtime dependencies, account access or additional online asset requests.
