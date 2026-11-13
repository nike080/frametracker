# collection-interface Specification

## Purpose
TBD - created by archiving change ui-overhaul. Update Purpose after archive.
## Requirements
### Requirement: Focused catalog and dedicated goals page
The catalog SHALL group search, frame type, collection status, Prime availability and sorting in one filter panel. Explanations, timestamps and refresh for relic data SHALL be available in a collapsed disclosure with a visible freshness indicator. Goals and next collection actions SHALL live on a dedicated goals route linked from primary navigation. Catalog filters SHALL survive navigation between pages and resetting SHALL clear all catalog filters.

#### Scenario: Continue a goal without catalog clutter
- **WHEN** a user navigates to My goals
- **THEN** priorities, next actions and result recording are available there, and the catalog shows filters and results without those planning sections

### Requirement: Stable frame panel and direct component status
The frame dialog SHALL keep a viewport-relative height with internal scrolling when recipes or sources expand. Component status controls SHALL remain visible outside recipe disclosures. Recipes SHALL start collapsed on opening a frame and retain their expanded state during progress edits. Recording a crafted component SHALL preserve existing undo behavior and SHALL NOT consume stock automatically.

#### Scenario: Record a crafted component
- **WHEN** a user opens a frame and records an already crafted chassis
- **THEN** no recipe expansion is required, the panel keeps its size, and the status control retains focus after the update

### Requirement: Working catalog hierarchy
The interface SHALL expose collection progress, search, type and status filters before the results grid without a large decorative hero preceding these controls.

#### Scenario: Return to a filtered collection
- **WHEN** a user opens a frame and returns to the catalog
- **THEN** search and filters remain active and focus returns to the originating frame

### Requirement: Readable responsive interface
The interface SHALL provide visible keyboard focus, text labels for collection statuses, and usable content at 360, 768 and 1440 CSS pixels in Russian and English. The page SHALL avoid horizontal overflow except inside explicitly scrollable data tables.

#### Scenario: Narrow Russian layout
- **WHEN** the catalog is viewed at 360 CSS pixels in Russian
- **THEN** navigation, search, filters and item actions remain readable and reachable without page-level horizontal scrolling

### Requirement: Explicit data states
The interface SHALL distinguish loading, empty results, unavailable or stale prices, actual spending, and failed progress saves using visible text. Missing prices SHALL NOT appear as zero cost.

#### Scenario: Save fails
- **WHEN** a progress write fails
- **THEN** the interface persistently displays the failure and a recovery instruction without reporting the progress as saved

#### Scenario: Quote is unavailable
- **WHEN** a component has no available market quote
- **THEN** its price is labelled unavailable and the summary indicates incomplete coverage separately from actual spending

### Requirement: Search recovery and material discovery
The interface SHALL provide a material name search and explicit reset controls for catalog search and stage filters. Empty catalog results SHALL explain that both search and filters affect the result.

#### Scenario: Recover from restrictive filters
- **WHEN** a user resets catalog filters after receiving no results
- **THEN** the query and stage filter are cleared and the full catalog becomes available

### Requirement: Visible mobile shortfall
The inventory SHALL show the resource name, needed amount, stock and shortfall at 360 CSS pixels without horizontal scrolling to discover the shortfall.

#### Scenario: Inspect a material on mobile
- **WHEN** a user finds a material at 360 CSS pixels
- **THEN** its shortfall is visible with its stock and requirement in the same responsive resource entry

### Requirement: Consistent stages and quote freshness
Catalog and summary SHALL distinguish not started, in progress and collected using the same collection state. Summary totals derived from stale quotes SHALL display a freshness warning independently from price coverage.

#### Scenario: No components collected
- **WHEN** an unowned frame has zero collected components
- **THEN** both catalog and summary label it not started

#### Scenario: Complete but stale coverage
- **WHEN** every market item has a quote but some quotes are stale
- **THEN** complete coverage does not suppress the warning about stale estimated totals

