# Validation — FT-23

- npm test: 42/42 passing.
- openspec validate ft-23-world-dashboard --strict: passing.
- Internal browser: default home, Stalker theme, 1265px and 390px layouts, live cycles for six locations, daily reset shown as 03:00 Europe/Moscow, Prime lineup, three sortie missions, Nightwave season/challenges, inventory navigation and return home.
- Full world-state endpoint reset its connection during investigation. Replaced with eight independent documented endpoints; actual live response verified in browser. Partial failures covered by test.
- Provider currently returns English mission/challenge text even with Russian language query/header. Interface and cycle labels are localized; source titles/descriptions are preserved verbatim. This is an explicit limitation, not invented translations.
- Portable EXE tested and approved by owner. Release 1.9.0 authorized for merge and publication; final 1.9.0 build and portable smoke check passed, including home.js/world-state.js byte-for-byte asset checks. All test processes closed. All 17 main OpenSpec specifications pass strict validation.
