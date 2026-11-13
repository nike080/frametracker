# Catalog and goals refinement

13 November 2026 · `codex/collection-ui-polish`.

Unified catalog filters; moved goal ordering and the collection assistant to `#goals`; collapsed relic data explanations with visible freshness. Existing status, availability and search semantics remain unchanged. No progress schema changes.

Internal browser, app launched with `PORT=4190 npm start -- --no-browser`:

- Search Ash + vaulted availability returned one Prime result. Filters survived navigation to goals and back; reset restored the catalog.
- Adding Ash in its detail panel exposed it on My goals with next action. Recording a blueprint advanced to chassis; undo restored the previous action.
- Removing the test goal kept the user on My goals and restored the empty state. Test blueprint change was undone.
- RU desktop screenshot inspected; goals absent from catalog, filters grouped together, data explanation collapsed.
- At 360 px, RU/EN catalog inspected with no page overflow. Found and fixed inherited 180px select flex basis; selectors now remain 44px high.
- Existing 23 tests pass. Windows build and portable verification are run for delivery.

FT-06 is closed by owner confirmation and was not retested.
