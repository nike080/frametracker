# faction-appearance Specification

## Purpose
TBD - created by archiving change orokin-faction-redesign. Update Purpose after archive.
## Requirements
### Requirement: Single faction palette preference
The application SHALL offer one appearance selector in Settings with Orokin Legacy and all 22 user-requested faction palettes. Each palette SHALL determine light or dark surfaces and accents without separate accent or surface selectors. Selection SHALL update all routes and the open detail panel without changing collection progress or losing active catalog filters.

#### Scenario: Switch faction
- **WHEN** the player chooses Red Veil and later New Loka
- **THEN** the first uses its dark identity, the second uses its light identity, and progress and catalog context remain unchanged

### Requirement: Resilient local appearance
The application SHALL persist a stable theme id separately from progress, recover unknown or malformed ids to Orokin Legacy, and keep the current session usable if storage is denied. A failed preference write SHALL be explained visibly without claiming the choice was saved.

#### Scenario: Invalid preference
- **WHEN** a stored id is unknown, an invalid legacy numeric value is supplied, or storage is unavailable
- **THEN** the application renders a valid palette and never indexes an absent theme definition

### Requirement: Faction identity and readable motion
Each palette SHALL display its original thematic motto in Russian or English according to the current language and use a matching embedded emblem where available. Mottos SHALL be disclosed as original interpretations. Missing emblems SHALL use the application mark. Text and controls SHALL remain readable on the palette's actual surfaces, with visible keyboard focus and reduced-motion support.

#### Scenario: Change language
- **WHEN** a faction palette is selected and the player switches language
- **THEN** the selected faction remains active and its name and thematic motto use the chosen language

