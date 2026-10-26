---
title: Roadmap
sectionType: Page
---

{% list tabs %}
- Plans (table){selected}

  
  
  | | Начало | Конец | Зависимости |
  |---|--------|-------|-------------|
  | Планирование | 01-2024 | 03-2024 |  |
  | &nbsp;&nbsp;&nbsp;&nbsp; Модуль «Бюджет» | 01-2024 | 02-2024 |  |
  | &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Бюджетирование | 01-2024 | 02-2024 |  |
  

- Plans (Gantt chart)

  <div class="gantt-wrapper">
    <div class="gantt-toolbar">
    <button type="button" class="gantt-toggle-btn js-toggle-pan" title="Перемещение мышью">
      🖐️ Перемещение (Pan)
    </button>
    <button type="button" class="gantt-toggle-btn js-toggle-zoom" title="Масштабирование колесом / Скролл страницы">
      🔍 Зум (Zoom)
    </button>
  </div>
  
  ```mermaid
  gantt
      title Release Plan
      dateFormat MM-YYYY
      axisFormat %m-%Y
      section Group 1
      Планирование :milestone, milestone_0, 01-2024, 01-2024
      Бюджетирование :active, f-1, 01-2024, 02-2024
  ```
  
    
  </div>

{% endlist %}