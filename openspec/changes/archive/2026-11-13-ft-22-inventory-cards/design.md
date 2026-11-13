## Context
Inventory shares stock with recipes and goals. Existing captureProgress/save/filterMaterials behavior remains authoritative.

## Goals / Non-Goals
Goals: fast manual stock updates, inline editing, complete RU/EN labels, preserved filters and unknown state.
Non-goals: automatic inventory import, crafting deductions, resource reservations and recipe-table redesign.

## Decisions
- Use a responsive grid of square cards; on narrow screens the cards may grow vertically to keep controls reachable.
- Render one changed card after stock updates and reapply search/deficit filtering. Restore focus to the action or deficit filter when a card disappears.
- Store integer quantities using the existing stock map. Explicit zero remains known; saving an empty editor deletes only that stock key. Cancel/Escape do not save.
- Quick changes start an unknown quantity from zero. Clamp adjustments to 0–999999999, matching existing input bounds; custom amounts must be positive integers. Exact editing accepts nonnegative integers or an empty unknown value.
- Bundle official ExportResources_ru names into catalog.json and retain English names for English UI/search. Keep provenance and an update script, and use the snapshot during catalog rebuilds.

## Risks / Trade-offs
Cards use more vertical space than tables. Custom and inline controls must remain usable on narrow screens. Official resource names can change, so refresh is explicit and unknown IDs retain existing fallback behavior during catalog updates.

## Migration Plan
No progress migration. Build version 1.8.0, compare embedded assets, run portable smoke checks, archive this change and merge the approved release.
