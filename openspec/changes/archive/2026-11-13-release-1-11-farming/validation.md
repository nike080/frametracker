# Validation

49 automated tests pass, including release-farming.test.mjs scenarios for all three tickets. Browser: Home Helminth count and collapsible list, Inventory materials/relic tabs and refinement fields rendered.

Acceptance pending: user examples for ten owned frames and whether a real common source changes the farming choice. No personal history inferred or altered. Source data is a bundled snapshot, not guaranteed exhaustive live availability.

OpenSpec change stays active; master specs and task completion in DEVELOPMENT-GOALS remain unchanged until acceptance and archive instruction.

Portable smoke check passed against final dist/FrameTracker.exe, including source asset equality, persistence, conflict, relaunch, fallback port and relocated exe. Test processes closed. Browser additionally verified live relic search and the missing-part relic summary in Atlas Prime.

Reproducible catalog example (not a personal playtest): Лаборатория Тэнно в додзё клана. Купите копию исследованного чертежа. → Banshee / Основной чертёж; Banshee / Каркас; Banshee / Нейрооптика; Banshee / Система; Nezha / Основной чертёж; Nezha / Каркас; Nezha / Нейрооптика; Nezha / Система; Volt / Основной чертёж; Volt / Каркас; Volt / Нейрооптика; Volt / Система; Wukong / Основной чертёж; Wukong / Каркас; Wukong / Нейрооптика; Wukong / Система; Zephyr / Основной чертёж; Zephyr / Каркас; Zephyr / Нейрооптика; Zephyr / Система. This identifies a shared activity; whether it changes the user’s farming choice awaits acceptance.

## Relic library follow-up
52 tests pass. Browser verified sequential typing of Lith A1 (value Lith A1, caret 7), filtering, expansion showing six rewards and four refinement chances, and the live rotation filter (40 matches in the observed feed). Personal stock was not changed. The input node is preserved on filtering; reward tables load only when expanded.

Updated portable smoke check passed, including embedded model.js and relic-library.js equality with source. Browser and portable test processes stopped. git diff --check passed.

## Final acceptance polish validation
55 tests pass. Added full-library page traversal, query against last library entries, combined filters, DOM-bound rendering and in-place spend regression tests. Archive display adapter covers unknown → vaulted and partial → available. Browser confirmed exactly 24 initial cards, sequential Lith A1 search, opening contents immediately after typing, a three-column desktop grid, reward table width 285.93px within a 286px container (no horizontal overflow), list-form locations under a spoiler, four archive filter options, and ordinary Atlas without relic advice.
No network request is needed for searching or pagination; stock writes retain existing progress persistence.

Final rebuilt dist/FrameTracker.exe passed the portable smoke check (embedded assets, persistence, conflicts, restart, fallback port and moved executable). Test processes stopped. OpenSpec remains active pending user acceptance and archive instruction.

## Release acceptance
Owner explicitly accepted the result and requested archive and release on 2026-11-13. This supersedes pending acceptance tasks. No separate ten-frame personal history or farming-choice interview is claimed. Requirements merged into farming-planning master spec and archive visibility requirement updated in live-prime-availability.

Final release checks: openspec validate --all --strict passed (19 specifications), npm test passed (55 tests), freshly rebuilt 1.11.0 portable smoke check passed. EXE SHA-256: 787cc0dd092a157b034dae0d6d017b2060568411454f3a467dec05f8131c4900. Test processes closed.
