# ft-20-relic-icons

## Purpose
Provide recognizable local icons for Lith, Meso, Neo and Axi relics without requiring image downloads at runtime.

## Requirements

### Requirement: FT-20: иконки реликвий
The application SHALL implement the following behavior:

Официальные PNG четырёх эр Lith/Meso/Neo/Axi в рецептах, справке по фарму и онлайн-доступности. Локальный снимок с источниками, постоянный размер, текст и заглушка при отсутствии изображения. Обновление атомарно после проверки PNG.

#### Scenario: Use the feature
- **WHEN** the user opens the affected view
- **THEN** the behavior above is available without changing saved progress
