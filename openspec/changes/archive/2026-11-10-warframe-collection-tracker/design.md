## Context

The application runs locally as a dependency-free Node server. The browser stores collection data and supports JSON backup and restore.

## Decisions

- Normalize a dated catalog snapshot using stable game IDs. Keep recipe dependencies instead of imposing four generic slots.
- Separate blueprint ownership, crafted components and completed Warframes. An owned crafted component suppresses its ingredient demand.
- Aggregate shared inventory after summing outstanding recipes. A resource checkbox raises the shared stock to the row target.
- Use the mean of up to five cheapest current cross-platform PC sell offers. Quote coverage is shown separately from entered purchase prices.
- Cache quotes, throttle requests and exclude the Founders exclusive from trade projections.
- Store the game version and official recipe manifest in the catalog snapshot. Refresh against current upstream data and compare by game IDs before reviewing the change.
