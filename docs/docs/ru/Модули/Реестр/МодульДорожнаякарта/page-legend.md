|               |                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| ID            | 32                                                                                                        |
| ID_Group      | 8                                                                                                         |
| ID_Type       | 2                                                                                                         |
| Идентификатор | `roadmap`                                                                                                 |
| title         | Модуль. Дорожная карта                                                                                    |
| capability    | `navigaciya`                                                                                              |
| family        | `fam-roadmap`                                                                                             |
| layer         | `pre-processing`                                                                                          |
| designation   | Генерирует docs/<lang>/roadmap/index.md с диаграммой Ганта и таблицей этапов из JSON-описания             |
| folder        | `src/plugins/roadMap/roadmap.js` ; `builders/*` ; `enums/` ; `patchers/ (используются отдельным модулем)` |
| entrypoint    | `runGeneration({ docsRoot, data, engine })`                                                               |
| role          | Пара-1                                                                                                    |
| version       | `1.54.0`                                                                                                  |

{: .page-legend }
