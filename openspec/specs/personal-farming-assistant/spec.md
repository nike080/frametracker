# personal-farming-assistant Specification

## Purpose
TBD - created by archiving change personal-farming-assistant. Update Purpose after archive.
## Requirements
### Requirement: Unknown stock
The app SHALL distinguish absent stock from explicit nonnegative integer stock, including zero, in displays, advice, saving and import.

#### Scenario: Missing legacy quantity
- **WHEN** a resource quantity is absent or cleared
- **THEN** the app displays unknown stock and a request to check it instead of a confirmed shortfall

#### Scenario: Explicit zero
- **WHEN** zero is recorded and progress is reloaded or exported and imported
- **THEN** zero remains a known quantity and produces a numeric shortfall

### Requirement: Recipe advice
The app SHALL show a concrete explained next action for each active goal using recipe prerequisites and recorded progress without claiming an optimal route or reserving shared resources.

#### Scenario: Advance a goal
- **WHEN** a blueprint, component or quantity is recorded
- **THEN** advice is recalculated through acquisition, unfinished children, stock checks, farming and crafting readiness

#### Scenario: Completed or unavailable goal
- **WHEN** a goal is complete or recipe/source information is unavailable
- **THEN** the app shows completion with a route to another goal or explicitly identifies missing information

### Requirement: Contextual source information
The app SHALL show known acquisition locations and conditions with snapshot date and source links and SHALL explicitly distinguish missing information from confirmed unavailability.

#### Scenario: Source details
- **WHEN** acquisition or material farming advice is expanded
- **THEN** known locations and rotations are shown with source links, catalog date and a warning that additional conditions and current availability may need verification

#### Scenario: Catalog update
- **WHEN** a newly built catalog has missing material references
- **THEN** replacement is blocked and the errors are reported, while unknown acquisition sources and relic missions produce warnings

### Requirement: Quick recording
The app SHALL allow recording blueprint acquisition, crafted components and relevant stock from the goal plan with existing undo and no silent material consumption.

#### Scenario: Record crafted component
- **WHEN** the player records a component as ready
- **THEN** progress and advice update, stock is unchanged, the manual stock rule is visible and undo restores the prior state

#### Scenario: Add loot
- **WHEN** a player enters a nonnegative integer loot quantity for a known stock
- **THEN** it is added to stock and undo restores the prior quantity

### Requirement: Resume context
The app SHALL support starting with one goal without filling the entire collection and SHALL persist goal notes and the latest recorded progress change through reload and export/import.

#### Scenario: Resume after restart
- **WHEN** the player returns after recording a change and a goal note
- **THEN** the goal plan shows the remaining requirements, next action, note and latest change

#### Scenario: Empty or completed goals
- **WHEN** there are no goals or an existing goal is complete
- **THEN** the app provides guidance to choose a frame from the catalog

