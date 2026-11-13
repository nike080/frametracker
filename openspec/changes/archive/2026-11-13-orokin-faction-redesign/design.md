## Context

User approved the light Orokin Archive layout, faction-specific light/dark identities, a single palette selector and one Settings tab. Independent accent and surface selectors were explicitly removed. The mockup exposed an invalid-index crash; production uses stable string ids and a total resolver.

## Decisions

- Keep all existing model and acquisition calculations. Layer the new geometry and token-based surfaces over existing functional selectors, so component and recipe controls retain their behavior.
- Use `themes.js` for 23 immutable definitions, safe id resolution and derived readable colors. Store only `frametracker:theme` in localStorage; progress import/export does not include appearance. Theme storage denial keeps the current session working and explains that persistence failed.
- Mount a single persistent Settings controls node into the active main region. Moving it preserves file, language and theme event listeners. Online status and batch progress remain current without replacing form controls during requests.
- Preserve automatic availability polling and automatic per-frame quotes. Move all manual refresh buttons to Settings, including a per-Prime selector. Catalog and summary retain freshness/coverage information and links to Settings.
- Use 15 embedded public emblems with their original identities; missing emblems use the existing application mark. Mottos are original interpretations, disclosed as such in both languages.
- Support 360/768/1440 layouts, focus indicators and reduced motion. No decorative hero before collection controls.

## Risks and limitations

- External portraits and live upstream services can still be unavailable. Their existing fallback and unknown/stale semantics remain in place.
- Appearance is scoped to the browser origin (port included), consistent with language preference. Portable progress remains profile-scoped.
- Browser QA uses deterministic online fixtures to avoid spending time or rate limits on upstream APIs. It verifies the relocated controls, not current market or relic accuracy.

## Rollout

Version 1.5.0, dedicated codex branch and reviewable PR. Rebuild the local executable and run isolated portable smoke checks. Main is not merged and no GitHub release is published by this change.
