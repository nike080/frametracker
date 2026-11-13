## ADDED Requirements

### Requirement: Separate equipment collections
The application SHALL provide separate collection pages for primary, secondary, melee, Archwing, Arch-gun, Arch-melee and Necramech equipment using the same cards and progress controls as Warframes.

#### Scenario: Open Necramechs
- **WHEN** the user opens the Necramech page
- **THEN** Voidrig and Bonewidow are shown with their exported recipes

### Requirement: Shared progress and inventory
All collection categories SHALL share inventory, goals, undo, persistence and export/import. Unknown stock SHALL remain distinct from explicit zero.

#### Scenario: Shared resource across categories
- **WHEN** active goals from different categories require the same material
- **THEN** their demand is combined and the shared stock is subtracted once

#### Scenario: Legacy progress
- **WHEN** a previous Warframe save is restored
- **THEN** its ownership, stock and goals remain intact

### Requirement: Honest acquisition data
The application SHALL display known recipe, relic and market information and indicate absent recipes without inventing crafting requirements.

#### Scenario: No exported recipe
- **WHEN** a user opens an item without an exported recipe
- **THEN** ownership remains editable and an explanation replaces the crafting checklist

### Requirement: Companion collection
The application SHALL include masterable animals, MOAs, hounds and Sentinels in a companion page using shared ownership, recipes where available and inventory persistence.

#### Scenario: Biological companion
- **WHEN** a user opens a companion without an exported crafting recipe
- **THEN** ownership is editable and no crafting requirements are invented

### Requirement: Home collection progress
The home page SHALL show overall ownership progress and separate Warframe, weapon, Archwing, Necramech and companion counters. Weapons SHALL include primary, secondary and melee breakdowns; Archwings SHALL include separate Archwing, Arch-gun and Arch-melee counters.

#### Scenario: Mixed owned equipment
- **WHEN** ownership changes in any collection category
- **THEN** the home category counter and overall progress reflect it without double counting

#### Scenario: No collected items
- **WHEN** all ownership states are empty
- **THEN** all progress values are zero with the actual catalog totals
