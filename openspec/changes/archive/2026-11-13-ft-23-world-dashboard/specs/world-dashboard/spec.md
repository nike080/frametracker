## ADDED Requirements

### Requirement: Visual home
The default route SHALL show collection metrics and descriptive navigation to primary sections in both languages and selected theme.

#### Scenario: Open application
- **WHEN** no hash is supplied
- **THEN** home is selected and catalog is reachable.

### Requirement: Live world state
Home SHALL show Earth, Cetus, Vallis, Cambion, Duviri and Zariman cycles when supplied, Prime availability, sortie, Nightwave series and active challenges. It SHALL show platform, source, freshness, missing data and a refresh action. It SHALL refresh while visible and on resume.

#### Scenario: Feed fails or expires
- **WHEN** refresh fails or an event expires
- **THEN** cached data is marked stale, expired data awaits refresh and unavailable sections remain explicit.

### Requirement: Local reset display
The standing timer SHALL target the next 00:00 UTC and display the instant in user local time.

#### Scenario: Different local date
- **WHEN** local time differs from UTC
- **THEN** all users count down to the same instant with locally formatted date and time.

