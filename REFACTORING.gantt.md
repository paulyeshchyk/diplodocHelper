@startgantt
Project starts 2026-11-12
today is colored in Salmon

title План унификации CLI: plugins.config.yaml + ModuleDef

' ============================================================
' СДЕЛАНО
' ============================================================
[Подготовка плана \n + CONTRIBUTING + FEATURE-MAP] as [D0] starts 2026-11-12
[D0] ends 2026-11-12
[D0] is colored in Green

' ============================================================
' WAVE 1. Типы, парсер, реестр, резолверы (~2.5 дня)
' ============================================================
-- Wave 1. Types + Parser + Registry --

[W1.1 cli/types + cli/args] as [W1a] starts at [D0]'s end
[W1a] ends 2026-11-13

[W1.2 cli/registry + cli/paths] as [W1b] starts at [W1a]'s end
[W1b] ends 2026-11-14

[W1.3 cli/config.constants + тесты] as [W1c] starts at [W1b]'s end
[W1c] ends 2026-11-14

' ============================================================
' WAVE 2. 5 MES-модулей через ModuleDef (~3 дня)
' ============================================================
-- Wave 2. 5 MES-модулей --

[W2.1 collectCatalog + buildPageLegend] as [W2a] starts at [W1c]'s end
[W2a] ends 2026-11-16

[W2.2 renderModules + emitModulesTable] as [W2b] starts at [W2a]'s end
[W2b] ends 2026-11-17

[W2.3 emitFeatureMap + тесты] as [W2c] starts at [W2b]'s end
[W2c] ends 2026-11-18

' ============================================================
' WAVE 3. Pipeline + 4-level merge (~3 дня)
' ============================================================
-- Wave 3. Pipeline runner + L1-L4 merge --

[W3.1 pipeline.types + constants] as [W3a] starts at [W2c]'s end
[W3a] ends 2026-11-19

[W3.2 pipeline.loader + merge] as [W3b] starts at [W3a]'s end
[W3b] ends 2026-11-20

[W3.3 pipeline.runner + CLI run-pipeline] as [W3c] starts at [W3b]'s end
[W3c] ends 2026-11-21

' ============================================================
' WAVE 4. init-config CLI (~3 дня)
' ============================================================
-- Wave 4. init-config --

[W4.1 inspector (эвристики)] as [W4a] starts at [W3c]'s end
[W4a] ends 2026-11-22

[W4.2 scaffolders ×5 + CLI] as [W4b] starts at [W4a]'s end
[W4b] ends 2026-11-24

[M1 PoC готов: \n Wave 1-4 \n можно применять к MES] as [M1] happens at [W4b]'s end
[M1] is colored in Orange

' ============================================================
' WAVE 5. Остальные 22 модуля (~2 недели)
' ============================================================
-- Wave 5. 22 оставшихся модуля --

[W5.1 Pre-фаза: 8 модулей] as [W5a] starts at [W4b]'s end
[W5a] ends 2026-11-28

[W5.2 Post-фаза: 10 модулей] as [W5b] starts at [W5a]'s end
[W5b] ends 2026-12-04

[W5.3 jsonToMd + roadMap + сложные] as [W5c] starts at [W5b]'s end
[W5c] ends 2026-12-09

' ============================================================
' WAVE 6. CLI to TypeScript (~1 день)
' ============================================================
-- Wave 6. diplodoc-helper-cli → .ts --

[W6.1 cli-main.ts + bootstrap] as [W6a] starts at [W5c]'s end
[W6a] ends 2026-12-10

[M2 Полная миграция \n CLI] as [M2] happens at [W6a]'s end
[M2] is colored in Orange

@endgantt