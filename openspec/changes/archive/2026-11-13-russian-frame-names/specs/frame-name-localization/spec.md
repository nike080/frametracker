## ADDED Requirements

### Requirement: Official localized frame names
The application SHALL show official Russian frame and variant names in RU and English names in EN across catalog cards, detail panels, goals, history, summaries and selectors. Names SHALL be bundled offline with source provenance, keyed by stable IDs. Unknown mappings SHALL fall back to the English catalog name.

#### Scenario: Change language
- **WHEN** a user changes RU to EN or EN to RU
- **THEN** displayed frame names update without changing saved progress or manual goal order

### Requirement: Bilingual frame search
Frame search SHALL match full or partial Russian and English names regardless of case, treating е and ё as equivalent. Changing language SHALL preserve the current search query and filters.

#### Scenario: Find a frame by Russian name
- **WHEN** the user searches for ЭШ ПРАЙМ or ash prime
- **THEN** the same frame is found in either language

### Requirement: Locale-aware frame ordering
Alphabetic frame lists SHALL sort by displayed names using ru-RU in RU and en-US in EN, including locale handling of е/ё. Availability sorting SHALL use localized alphabetic order within each availability group. User-prioritized goals SHALL retain their manual order.

#### Scenario: Russian catalog order
- **WHEN** the user views the RU catalog without search filters
- **THEN** Атлас appears near the beginning and Эш appears near the end according to Russian alphabetic order
