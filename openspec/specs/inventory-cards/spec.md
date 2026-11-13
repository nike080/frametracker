# inventory-cards Specification

## Purpose
Provide localized resource cards with quick, custom and inline stock editing while preserving shared stock, unknown values, filters and undo.
## Requirements
### Requirement: Resource card inventory
The inventory SHALL present resources as square cards with a bundled image, localized name, shared stock, scoped required quantity and shortfall. Cards MAY grow vertically on narrow screens to keep controls usable. Search, scope selection and deficit filtering SHALL remain available. Unknown stock SHALL display an unknown label and no confirmed numeric shortfall.

#### Scenario: Search in Russian with an English name
- **WHEN** a Russian user searches for Vainthorn in the entire collection
- **THEN** the card displays the official Russian name Вайнторн and its requirement, stock and shortfall state

#### Scenario: Scope is empty
- **WHEN** My goals has no selected goals
- **THEN** inventory explains how to select goals or view the entire collection without inventing goal demand

### Requirement: Quick and custom stock adjustments
Each card SHALL offer ±1, ±10, ±100 and ±1000 buttons plus a positive integer custom amount with Add and Remove actions. Adjustments SHALL start unknown stock at zero and clamp results to 0–999999999. Changes SHALL update shared stock, shortfall and filters, use existing persistence and support existing undo.

#### Scenario: Subtract beyond current stock
- **WHEN** the user subtracts 1000 from stock of 100
- **THEN** stock becomes known zero and never negative

#### Scenario: Custom addition and undo
- **WHEN** the user adds a custom quantity and invokes Undo
- **THEN** shared stock returns to its previous value and knowledge state

### Requirement: Inline stock editing and explanation
The current stock SHALL be an underlined button opening a hidden inline editor. Save or Enter SHALL accept nonnegative integer quantities up to 999999999; saving an empty field SHALL restore unknown stock. Cancel or Escape SHALL discard the edit. An instruction above the cards SHALL explain clicking stock and using quick/custom controls in Russian and English.

#### Scenario: Save exact stock
- **WHEN** the user clicks stock, enters 777 and saves
- **THEN** the editor closes and stock and shortfall update without navigating away

#### Scenario: Cancel editing
- **WHEN** the user changes an editor value and presses Escape
- **THEN** the editor closes and the previous stock remains unchanged

#### Scenario: Restore unknown stock
- **WHEN** the user clears the inline stock field and saves
- **THEN** the resource is unknown rather than known zero and undo can restore the previous quantity

### Requirement: Complete resource localization
Every bundled catalog resource SHALL have an official Russian name and a retained English name. The catalog build SHALL consume the checked-in official-name snapshot. Names SHALL NOT change resource IDs or saved quantities.

#### Scenario: Switch language
- **WHEN** the user switches between Russian and English
- **THEN** every resource uses the selected language while quantities and identifiers remain unchanged

