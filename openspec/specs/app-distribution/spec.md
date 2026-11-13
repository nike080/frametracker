# app-distribution Specification

## Purpose
TBD - created by archiving change simplify-frametracker-distribution. Update Purpose after archive.
## Requirements
### Requirement: Portable Windows launch
FrameTracker SHALL provide a Windows x64 executable with a bundled runtime and catalog that opens the interface in the default browser.

#### Scenario: Launch on Windows
- **WHEN** the user starts the executable
- **THEN** FrameTracker serves the embedded catalog on a loopback address and opens its URL without requiring a separately installed Node.js runtime

#### Scenario: Repeat launch
- **WHEN** a portable instance is already running
- **THEN** another launch opens the existing instance

### Requirement: Persistent portable collection
FrameTracker SHALL store portable progress in the Windows user profile independently of the executable and protect it against stale writes.

#### Scenario: Replace the executable
- **WHEN** the user saves progress, stops FrameTracker and starts a newer or relocated executable under the same Windows account
- **THEN** the collection, inventory and recorded purchase prices are loaded from the existing profile

#### Scenario: Migrate browser progress
- **WHEN** the portable app opens at the previous address in the same browser profile and its progress file is empty
- **THEN** it imports the existing browser progress
- **AND** the existing JSON import remains available from other browser profiles or addresses

#### Scenario: Save from an outdated tab
- **WHEN** a write uses a revision older than the saved revision
- **THEN** the app keeps the latest file and reports the conflict

### Requirement: Local catalog availability
FrameTracker SHALL serve its bundled collection data when the external price service is unavailable.

#### Scenario: Warframe.market is unavailable
- **WHEN** the price request cannot be completed
- **THEN** the bundled catalog and collection editing remain available
- **AND** the quote is marked unavailable or stale

### Requirement: Embedded faction interface assets
The Windows executable SHALL embed and serve the Orokin stylesheet and theme module in addition to existing assets. All 23 palette definitions and available faction emblems SHALL work without requesting a remote theme resource.

#### Scenario: Portable appearance
- **WHEN** the rebuilt executable starts in an isolated Windows profile
- **THEN** the local server serves the Settings shell, Orokin stylesheet and all faction definitions from embedded assets

