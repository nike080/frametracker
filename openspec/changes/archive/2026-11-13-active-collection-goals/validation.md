# Validation · 13 November 2026

- Branch: codex/active-collection-goals.
- npm test: 10 passed, including normalization, scoped/shared demand, legacy absence, JSON round-trip and one-step history isolation.
- node --check public/app.js: passed.
- openspec validate active-collection-goals --strict: passed.
- Live browser on isolated source origin 127.0.0.1:4192: opened Ash, added goal, opened goal resources (11 materials; 70,000 credits), reloaded and verified goal retained. Toggled Enough for credits, undid it, verified stock returned to zero. Switched to English and verified localized resource scope and undo, then returned to Russian.
- Inspected desktop screenshot of catalog with Ash goal. Existing collection save on other origins and Windows profile was not edited. The test origin retains its separate Ash goal.
- During verification, corrected empty goals displaying a misleading materials-complete message, and kept Summary on entire-collection demand regardless of inventory scope.
- Not checked: full mobile/keyboard audit, multiple-goal ordering in live UI, file chooser import/export in browser, Windows portable build and disk error/conflict paths. These remain verification limitations; no EXE release is produced.
- OpenSpec change remains active for review; no archive, merge or release performed.
