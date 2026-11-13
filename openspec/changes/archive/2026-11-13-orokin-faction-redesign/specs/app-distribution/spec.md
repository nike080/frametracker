## ADDED Requirements

### Requirement: Embedded faction interface assets
The Windows executable SHALL embed and serve the Orokin stylesheet and theme module in addition to existing assets. All 23 palette definitions and available faction emblems SHALL work without requesting a remote theme resource.

#### Scenario: Portable appearance
- **WHEN** the rebuilt executable starts in an isolated Windows profile
- **THEN** the local server serves the Settings shell, Orokin stylesheet and all faction definitions from embedded assets
