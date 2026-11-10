## Context

FrameTracker renders three routes and a detail dialog from one browser module. The catalog generator combines English game data with Russian editorial labels and acquisition notes.

## Goals

Support Russian and English across the shared header, all routes, detail dialogs, and feedback. Preserve the user's active route, filters, and collection when switching languages.

## Decisions

- Default to Russian and store the explicit language choice in browser storage under a separate key. The existing HTML supplies the first-load Russian text, and the selected language is applied before loading the catalog.
- Use a keyed browser dictionary for UI copy and Intl for numbers and dates. Re-render from the current state so pending price requests and progress writes continue across a switch.
- Generate English fields alongside existing Russian catalog labels. Use upstream spellings for game entities, and pair editorial notes with English translations in the generator so both languages survive catalog refreshes.
- Serve the dictionary in the development server and package it as an executable asset.

## Risks / Trade-offs

Browser storage can be unavailable or scoped to another browser or origin. The language can still be switched for the current session. Upstream proper names and drop-table location strings retain their source spellings.
