# live-prime-availability Specification

## Purpose
TBD - created by archiving change live-prime-availability. Update Purpose after archive.
## Requirements
### Requirement: Online relic availability
The app SHALL combine WFCD relic reward IDs and the official active Varzia rotation to classify every catalog Prime recipe part without reading player account data.

#### Scenario: Aya relic versus paid bundle
- **WHEN** a current Varzia offer is a relic purchased with regular Aya
- **THEN** its reward parts are obtainable through Resurgence while paid Prime bundles are excluded

#### Scenario: Rotation boundary
- **WHEN** a rotation has not started or has expired
- **THEN** its offers are not asserted as currently obtainable

### Requirement: Catalog visibility
The app SHALL display full, partial, vaulted or unknown availability and the available part count on Prime cards before opening them, with availability filtering and sorting.

#### Scenario: Full set and personal progress
- **WHEN** all recipe parts including the main blueprint have current relic sources
- **THEN** the card shows a complete available set independently of owned components

#### Scenario: Missing source knowledge
- **WHEN** a part has no mapped relics or a vault flag is unknown
- **THEN** the app shows unconfirmed availability instead of inferring vaulted

### Requirement: Cross-linked part details
The app SHALL show per-part current relic names and distinguish regular sources from Varzia for Aya, explaining that vaulted relics may still be owned, traded or opened by squadmates.

#### Scenario: Open a Prime card
- **WHEN** a user opens a Prime frame
- **THEN** its part details show obtainable relics and their known locations or Aya channel

### Requirement: Freshness and offline behavior
The app SHALL timestamp both sources, coalesce requests, cache results, allow manual refresh with a one-minute retry limit, and degrade failed or stale information to unknown without modifying progress.

#### Scenario: Source outage
- **WHEN** a source fails after a successful load
- **THEN** cached clues remain with a stale warning and availability is unconfirmed

#### Scenario: Background refresh
- **WHEN** availability refreshes while a goal note is being edited
- **THEN** the entered text is preserved

