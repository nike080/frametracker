## ADDED Requirements

### Requirement: Dismiss frame card from its backdrop
The frame dialog SHALL close when a primary pointer gesture starts and ends on its backdrop. The dismissing click SHALL be consumed without activating controls beneath the dialog. The opening click SHALL NOT dismiss the dialog.

#### Scenario: Return to filtered catalog
- **WHEN** the user clicks the backdrop of an open frame card
- **THEN** the dialog closes, filters and progress remain unchanged, and focus returns to its opener

### Requirement: Preserve interactions inside the card
Clicks on content, empty interior space, fields, buttons and scrollbars SHALL NOT dismiss the card. A gesture starting inside and ending outside, a cancelled pointer, a secondary button or keyboard activation SHALL NOT trigger backdrop dismissal.

#### Scenario: Select text toward the backdrop
- **WHEN** the user presses inside the card and releases outside
- **THEN** the card remains open

### Requirement: Preserve existing close and menu behavior
Close buttons and Escape SHALL continue to work. Native dropdown menus SHALL keep their browser outside-dismiss behavior and consume their dismissing interaction before lower layers. Inline recipe and help disclosures SHALL NOT be treated as popup menus.

#### Scenario: Close a native dropdown
- **WHEN** the user clicks outside an open native selector
- **THEN** the selector closes without activating the element beneath that click
