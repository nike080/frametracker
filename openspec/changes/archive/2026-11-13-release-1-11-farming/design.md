# Design

Старое done означает владение, не освоение. mastered/helminth независимы. repeat использует repeatParts, сохраняя старые компоненты; завершение повторной сборки снимает repeat. Гельминт только у обычных варфреймов, исключая Umbra.

Источники объединяются только по полному where, включая ротацию; прямые награды и добыча реликвии — разные группы. Это консервативная группировка снимка, не оптимальный маршрут.

Реликвии: полный список имён из локального снимка warframe-items плюс ссылки каталога. Четыре отдельных количества, неизвестный источник не означает отсутствие. Вероятности в деталях относятся к исходной нетронутой реликвии; число попыток не гарантирует награду. Запас общий, без резервирования.

## Relic library follow-up
Search filters cached catalog metadata and renders a bounded page without replacing the input, preserving caret and selection. Reward tables are created on first expansion to avoid eagerly rendering thousands of cells. Generator stores actual per-refinement rewards from the cached WFCD Relics snapshot. Online availability now exposes individual relic statuses in addition to frame aggregates. Source filters distinguish confirmed live rotation, known sources (including catalog missions), and no known source; absent source data is not treated as proof of unavailability.

## Final acceptance polish
Cache relic source and goal metadata once per inventory refresh. Filter this array and render only 24 matching cards. Search replaces only the result grid; change-on-blur does nothing because input already handled the query. Spending updates one row in place. Source lists are collapsed and structured. Archive availability uses an explicit display adapter (partial → available, unknown → vaulted) while keeping feed semantics for other views.
