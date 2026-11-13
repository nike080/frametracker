# active-collection-goals Specification

## Purpose
TBD - created by archiving change active-collection-goals. Update Purpose after archive.
## Requirements
### Requirement: Ordered active goals
The app SHALL allow adding recipe-backed frames as unique ordered goals, removing them and moving them up or down. It SHALL retain completed goals with their completion status and explain that ordering does not reserve stock.

#### Scenario: Manage a goal
- **WHEN** a player adds a frame and moves it above another goal
- **THEN** the catalog displays that order without duplicates and allows opening and removing each goal

#### Scenario: Complete a goal
- **WHEN** a selected frame is marked owned
- **THEN** it remains visible as completed and contributes no resource demand

### Requirement: Scoped material demand
The inventory SHALL offer My goals and Entire collection modes, defaulting to My goals. It SHALL aggregate demand only for the selected scope and subtract shared stock once. It SHALL explicitly explain an empty goal selection without falling back to collection demand.

#### Scenario: Shared resource
- **WHEN** two goals require a shared material
- **THEN** inventory shows their combined requirement and one stock quantity with the combined shortfall

#### Scenario: No goals
- **WHEN** My goals is selected with an empty goal list
- **THEN** the app explains how to add goals and offers the collection mode

### Requirement: Persisted compatible goals
The app SHALL preserve goal order through normal saving and export/import, default old saves to an empty list, and discard duplicate, malformed, unknown and recipe-less goal IDs.

#### Scenario: Legacy progress
- **WHEN** an existing save without goals is loaded
- **THEN** ownership and stock remain unchanged and goals are empty

### Requirement: Undo latest progress change
The app SHALL offer a localized one-step undo for the latest ownership, component, stock, spending, goal or import change during the current session. Undo SHALL restore and save the preceding state; navigation and market refresh SHALL NOT replace the snapshot.

#### Scenario: Correct an accidental component update
- **WHEN** the player updates a component and then selects Undo
- **THEN** the previous component state and material demand are restored and saved

#### Scenario: No history
- **WHEN** the page is newly loaded or undo has been used
- **THEN** undo controls are disabled until the next progress change

