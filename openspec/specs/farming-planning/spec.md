# farming-planning Specification

## Purpose
Plan shared farming, independent collection states and personal relic stock across the collection.

## Requirements

### Requirement: Shared sources
The application SHALL implement shared sources as specified in the following scenarios.

#### Scenario: Two active goals
- **WHEN** the user performs the described collection or farming action
- **THEN** Given missing rewards sharing an exact source and rotation, show the source, both goals and rewards. Different rotations remain separate. Owned rewards and completed branches are excluded. With no overlap show an explicit empty state.

### Requirement: Independent collection states
The application SHALL implement independent collection states as specified in the following scenarios.

#### Scenario: Legacy import
- **WHEN** the user performs the described collection or farming action
- **THEN** Importing done preserves ownership without inventing mastery or Helminth. Changing ownership preserves mastery and subsumption. Prime, equipment and Umbra cannot be subsumed.

#### Scenario: Repeat build
- **WHEN** the user performs the described collection or farming action
- **THEN** Enabling repeat adds the goal and starts independent components and demand without erasing history. Completion clears repeat.

#### Scenario: Helminth tracker
- **WHEN** the user performs the described collection or farming action
- **THEN** Show subsumption badges and filters in collection, and a count with frame links on Home. No subsumption resource demand.

### Requirement: Personal relic stock
The application SHALL implement personal relic stock as specified in the following scenarios.

#### Scenario: Sparse inventory
- **WHEN** the user performs the described collection or farming action
- **THEN** Search the relic library and edit nonnegative integer quantities at each refinement independently. Export/import preserves counts. Invalid counts are discarded.

#### Scenario: Prime planning
- **WHEN** the user performs the described collection or farming action
- **THEN** A frame shows available attempts for each missing part, or asks to obtain relics. A shared stock is never promised to guarantee a drop. Inventory can filter relics linked to missing active goal parts.

#### Scenario: Open relic
- **WHEN** the user performs the described collection or farming action
- **THEN** Decrease a positive stock by one, then undo restores it. Zero cannot be decremented. Unknown source is labelled unknown.

### Requirement: Stable relic search and source filters
The application SHALL implement stable relic search and source filters as specified in the following scenarios.

#### Scenario: Typing and editing a query
- **WHEN** the user performs the described collection or farming action
- **THEN** Typing successive characters preserves their order and caret position. Searching updates a bounded result grid without replacing the focused input; clearing restores matches.

#### Scenario: Combined filters
- **WHEN** the user performs the described collection or farming action
- **THEN** Search, goal-only and source filters combine. Show a result count and explicit empty state. Separate live in-rotation results from known snapshot sources and missing source information. Stale or failed online data cannot assert current rotation.

#### Scenario: Relic contents
- **WHEN** the user performs the described collection or farming action
- **THEN** Click or keyboard-open a relic heading to reveal all rewards and chances for intact, exceptional, flawless and radiant variants from the bundled source. Show exact available percentages to two decimal places. Opening contents never changes stock. Missing reward data is explicit.

### Requirement: Release acceptance polish
The application SHALL implement release acceptance polish as specified in the following scenarios.

#### Scenario: Ordinary items
- **WHEN** the user performs the described collection or farming action
- **THEN** Non-Prime item details and component sections do not show relic inventory advice.

#### Scenario: Simplified archive filters
- **WHEN** the user performs the described collection or farming action
- **THEN** Archives offer All, In rotation, Prime Resurgence, Vaulted. Partial maps to In rotation; unknown and absent availability map to Vaulted by explicit user preference. No part-count badge is shown. This presentation rule does not change underlying online data or the relic inventory filter.

#### Scenario: Bounded relic rendering
- **WHEN** the user performs the described collection or farming action
- **THEN** Display at most 24 cards per page. Search covers the entire library and resets pagination. Preserve the input and selection when rendering results; a blur after typing must not rebuild results and swallow a card click. Spending a relic changes only its count row without replacing the grid or losing expanded sections.

#### Scenario: Readable cards
- **WHEN** the user performs the described collection or farming action
- **THEN** Desktop shows three relic columns, with responsive two and one column layouts. Reward tables fit the card without horizontal scrolling. All drop sources are under a separate spoiler, one source per list item.
