# ft-27-stalker-theme

## Requirements

### Requirement: FT-27: тёмная тема Сталкер по умолчанию
The application SHALL implement the following behavior:

Новая отдельная тема: угольные поверхности, алые акценты, девиз RU/EN. Отсутствующий или некорректный выбор использует Сталкер; сохранённые ID прежних тем остаются действительными. Все старые темы и основные компоненты интерфейса сохраняются. Контраст текста не ниже 4.5:1.

#### Scenario: Use the feature
- **WHEN** the user opens the affected view
- **THEN** the behavior above is available without changing saved progress
