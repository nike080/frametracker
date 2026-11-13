## MODIFIED Requirements

### Requirement: Focused catalog and dedicated goals page
The catalog SHALL group search, frame type, collection status, Prime availability and sorting in one filter panel. Explanations and timestamps for relic data SHALL remain available in a collapsed disclosure with a visible freshness indicator; all manual online refresh controls SHALL live in Settings. Goals and next collection actions SHALL live on a dedicated goals route linked from primary navigation. Catalog filters SHALL survive navigation between pages and resetting SHALL clear all catalog filters.

#### Scenario: Continue a goal without catalog clutter
- **WHEN** a user navigates to My goals
- **THEN** priorities, next actions and result recording are available there, and the catalog shows filters and results without those planning sections

## ADDED Requirements

### Requirement: Unified Settings route
The primary navigation SHALL expose Settings containing appearance, relic availability refresh, batch price loading with cancellation and progress, per-Prime price requests, progress import/export and language. Catalog, summary and frame details SHALL retain their data, freshness and spending controls without manual online refresh buttons. Existing automatic refresh behavior SHALL remain intact. Online tasks SHALL not force navigation back to Settings or lose batch status when another route is opened.

#### Scenario: Refresh market data
- **WHEN** the player requests prices from Settings and visits another section
- **THEN** price loading continues, navigation remains on the requested section, and returning to Settings shows task progress or completion

#### Scenario: Transfer progress
- **WHEN** the player imports or exports progress in Settings
- **THEN** the existing progress format, replacement confirmation and undo behavior remain available, and appearance is not overwritten
