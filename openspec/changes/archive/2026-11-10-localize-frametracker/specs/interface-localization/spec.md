## ADDED Requirements

### Requirement: Shared language selector
FrameTracker SHALL offer Russian and English in a shared top-right header control on the Catalog, Inventory, and Summary routes. The language choice SHALL persist across reloads in the same browser origin when browser storage is available.

#### Scenario: Switch while using collection filters
- **WHEN** a user switches to English with an active route or catalog filter
- **THEN** the route, filter, and progress stay in place and the document language updates to English

#### Scenario: Reopen the application
- **WHEN** a user reloads the application after selecting English
- **THEN** the application displays English and the selector shows English

### Requirement: Bilingual collection presentation
FrameTracker SHALL localize interface labels, accessibility text, notices, recipe labels, material names, and editorial acquisition notes for the selected language. Catalog generation SHALL preserve both languages and stable game identifiers.

#### Scenario: Open an item in English
- **WHEN** a user opens a recipe or checks the collection summary with English selected
- **THEN** editorial text and status labels appear in English and numbers and dates use English formatting
