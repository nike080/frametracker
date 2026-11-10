## ADDED Requirements

### Requirement: Collection catalog and recipes
The app SHALL show the released standard and Prime collection, portraits, sources and trackable recipe components.

#### Scenario: Nested Equinox recipe
- **WHEN** the user opens Equinox
- **THEN** the checklist lists both aspects and their distinct chassis, neuroptics and systems

### Requirement: Material inventory and collection summary
The app SHALL persist ownership and resource counts and show combined outstanding demand.

#### Scenario: Shared material
- **WHEN** two unfinished recipes require the same resource
- **THEN** the app subtracts inventory once from their combined requirement

### Requirement: Prime relics and Platinum
The app SHALL show known relic rewards and market estimates, and distinguish estimates from entered spending.

#### Scenario: Market coverage is incomplete
- **WHEN** a tradeable component has no quote
- **THEN** the interface indicates incomplete coverage and does not count it as free

### Requirement: Versioned game data
The app SHALL display the target PC game version and record the catalog retrieval date and official recipe manifest.

#### Scenario: Refresh after a game update
- **WHEN** a maintainer refreshes the current sources with a verified game version
- **THEN** the refresh records that version and reports additions, removals, recipe changes, acquisition changes and relic changes against the previous snapshot
