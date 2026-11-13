# material-icons Specification

## Purpose
TBD - created by archiving change material-icons. Update Purpose after archive.
## Requirements
### Requirement: Official offline material imagery
The application SHALL display official Warframe material icons beside text names in recipes, inventory and demand/deficit tables. Icons SHALL be bundled locally, mapped by stable material ID, with a recorded official source URL for each image.

#### Scenario: View materials without internet
- **WHEN** a user opens a material table without an internet connection
- **THEN** bundled icons, names and quantities remain available

### Requirement: Accessible stable fallback
Material icons SHALL use consistent dimensions and preserve readable names and quantities. Missing or broken images SHALL show a neutral placeholder without changing row geometry. A missing icon snapshot SHALL NOT prevent application startup.

#### Scenario: Image cannot be decoded
- **WHEN** a material image fails to load
- **THEN** its placeholder remains visible and the name, quantities and stock controls remain usable

#### Scenario: Missing material mapping
- **WHEN** a catalog material has no icon entry
- **THEN** the row displays a placeholder and its text normally

### Requirement: Reproducible official snapshot
The update script SHALL resolve the official export manifest, validate downloaded PNGs and replace the snapshot only after every current catalog material has an image. The portable build SHALL include the snapshot.

#### Scenario: Update fails
- **WHEN** an image download or validation fails
- **THEN** the previous snapshot remains intact and the update reports a failure
