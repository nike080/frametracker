## ADDED Requirements

### Requirement: FT-24: популярные билды Overframe
The application SHALL implement the following behavior:

В карточке фрейма доступна внешняя ссылка на страницу билдов Overframe с сортировкой по рейтингу по умолчанию. Обычная и Prime-версии используют общую страницу из каталога Overframe; Umbra ведёт к Excalibur. Для неизвестных будущих фреймов ссылка не выдумывается.

#### Scenario: Use the feature
- **WHEN** the user opens the affected view
- **THEN** the behavior above is available without changing saved progress
