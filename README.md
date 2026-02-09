# sergeenkov.com

Персональный сайт, размещённый на GitHub Pages.

## Структура

- `index.html` — главная страница
- `style.css` — стили
- `feed.xml` — RSS лента
- `images/` — изображения
- `*/` — статьи (каждая в своей папке)

## Автоматический мерж

В проекте настроен автоматический мерж веток Claude в main.

### Как это работает

1. При push в любую ветку `claude/*` срабатывает GitHub Actions
2. Workflow автоматически мержит ветку в `main`
3. Изменения сразу попадают на сайт

### Конфигурация

Настройки находятся в `.github/workflows/auto-merge.yml`

```yaml
on:
  push:
    branches:
      - 'claude/**'
```

Мерж происходит от имени `github-actions[bot]` без создания Pull Request.
