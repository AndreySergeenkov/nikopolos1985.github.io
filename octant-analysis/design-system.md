# Octant Design Code

Системные токены и компоненты, извлечённые из `octant-analysis/octant-source/` (исходники `octant.app` от 2026-05). Всё, что нужно чтобы страница выглядела неотличимо от родного Octant.

Источники: `index-BWHOjG-S.css` (app), `styles.ce3cc04e.css` (docs), `Octant App.htm`, `logo.svg`, скриншоты `1.png` / `2.png`.

---

## 1. Палитра

### База (warm tone, не чистый чёрно-белый)

| Токен | Hex | Назначение |
|---|---|---|
| `--color-grey-100` | `#0d0d0d` | основной фон app, фон карточек |
| `--color-grey-90`  | `#171717` | hover фон карточек, фон input |
| `--color-grey-80`  | `#333231` | disabled текст, secondary hover |
| `--color-grey-70`  | `#424240` | border / divider |
| `--color-grey-50`  | `#646360` | secondary / muted text |
| `--color-grey-30`  | `#8f8f8a` | tertiary text, gray chart segment |
| `--color-grey-20`  | `#cccbc4` | очень светлый серый |
| `--color-light-100`| `#fefdf4` | основной текст на тёмном (warm off-white) |

### Прозрачные накладки (off-white с alpha)

| Токен | Hex+alpha | Когда |
|---|---|---|
| `--color-light-10` | `#fefdf41a` | дисабленные элементы |
| `--color-light-40` | `#fefdf466` | hint text |
| `--color-light-80` | `#fefdf4cc` | border на тёмном |
| `--color-light-90` | `#fefdf4e6` | active state |

### Акценты (используются в чартах и категорийной разметке)

| Токен | Hex | Семантика в Octant |
|---|---|---|
| `--color-orange-100` | `#ff9602` | основной accent, "moved to next epoch", прогресс |
| `--color-teal`       | `#78f0e2` | "claimed by users" / pool |
| `--color-pink`       | `#ff8ce0` | "community fund" / category |
| `--color-yellow`     | `#ffea4d` | "PPF" / warning-soft |
| `--color-green`      | `#92ff33` | "project costs" / success |
| `--color-grey-30`    | `#8f8f8a` | "donated to projects" / neutral |

Варианты orange (для glow и фонов):
- `--color-orange-20`  : `#feeac8` (светлый плашка)
- `--color-orange-10`  : `#ff96021a` (тонкий tint)
- glow shadow          : `0 0 8px #ffca8040`

### Светлая тема docs (для справки)

- primary: `#3578e5` (синие ссылки)
- sidebar bg: `#1b1b1d`
- success: `#00a400`, warning: `#ffba00`, danger: `#fa383e`, info: `#54c7ec`

---

## 2. Типографика

### Семейства

```css
--font-sans:    "Spiegel Sans", sans-serif;     /* основной UI */
--font-display: "Arcane Fable", sans-serif;     /* большие числа, hero — это serif-like display */
--font-address: "IBM Plex Mono", monospace;     /* адреса, тикеры, числа в таблицах */
```

Spiegel Sans и Arcane Fable — не публичные. Для standalone-страницы подменяем:

```css
--font-sans:    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-display: "IBM Plex Serif", Georgia, "Times New Roman", serif;
--font-address: "IBM Plex Mono", ui-monospace, monospace;
```

### Веса

`400` regular · `500` medium · `600` semibold · `700` bold · `900` black

### Шкала размеров

| Назначение | Размер | LH | Weight | Letter-spacing |
|---|---|---|---|---|
| Display Title | 80px | 1.2 | 400 | -0.06em |
| Display Small | 64px | 1.2 | 400 | -0.06em |
| Display XSmall | 40px | 1.2 | 400 | -0.06em |
| Large | 27px | 1.2 | 600 | – |
| Medium semibold | 18px | 1.2 | 600 | – |
| Medium semibold ALLCAPS | 18px | 1.2 | 600 | wider |
| Small regular | 15px | 1.2 | 400 | – |
| Small semibold | 15px | 1.2 | 600 | – |
| Address med | 14px | 1.2 | 400–700 | – |
| 2xs semibold | 12px | 16px | 600 | – |

Все display-числа в app (`346.12 TOTAL ETH`, `65.45071 WETH`) идут display-шрифтом, ALLCAPS подписи под ними — sans semibold с увеличенным tracking.

---

## 3. Радиусы (важная часть стиля — всё минимально)

```css
--radius-xs:  0.5px;
--radius-sm:  0.75px;
--radius-md:  1px;
--radius-lg:  1.5px;   /* rounded-lg в Tailwind */
--radius-xl:  3px;
--radius-2xl: 4px;     /* кнопки, селекты */
--radius-3xl: 6px;
--radius-4xl: 10px;    /* самые "крупные" карточки */
```

Карточки и кнопки в app фактически имеют 3–4px радиус — это сознательный технический look. Пиллы (`rounded-full`) — только для прогресс-баров и иконок аватара.

Border у всех панелей — `0.5px solid var(--color-grey-70)`. Половина пикселя — тонкая линия, важная деталь.

---

## 4. Spacing

База: `--spacing: 0.25rem` (4px). Все паддинги/гэпы — кратны.

Самые частые: `12 / 16 / 20 / 24 / 32 / 40 px`.

Карточка app: `p-4` (16px) для компактных, `px-15 py-10` (60/40px) для больших на desktop.

---

## 5. Компоненты

### Карточка (panel)

```css
.card {
  background: var(--color-grey-100);
  border: 0.5px solid var(--color-grey-70);
  border-radius: 4px;
  padding: 20px 24px;
}
.card:hover { background: var(--color-grey-90); }
```

### Кнопка primary (ghost с double-border)

В Octant primary action — это outline-кнопка с тонкой двойной рамкой и orange glow на hover. Высота `48px`, радиус `4px`, текст `med-semibold-allcaps`, цвет `var(--color-grey-30)` → `var(--color-light-100)` на hover.

```css
.btn {
  height: 48px;
  padding: 0 20px;
  border-radius: 4px;
  background: var(--color-grey-90);
  border: 0.5px solid var(--color-grey-70);
  color: var(--color-grey-30);
  font: 600 13px/1.2 var(--font-sans);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn:hover {
  color: var(--color-light-100);
  border-color: var(--color-orange-20);
  box-shadow: 0 0 8px #ffca8040;
  background: var(--color-grey-80);
}
```

### Tab-навигация

`flex gap: 20px`, нижняя граница `1px solid var(--color-light-100)`, у активного таба цвет `--color-light-100`, у неактивных `--color-grey-50` / `--color-grey-30`. Никаких подчёркиваний под активным — он просто ярче.

### Прогресс-бар

```css
.progress {
  height: 6px;
  background: var(--color-grey-70);
  border-radius: 9999px;
  overflow: hidden;
}
.progress > .fill {
  height: 100%;
  background: var(--color-orange-100);
  border-radius: 9999px;
  transition: width 0.3s ease;
}
```

### Таблица / leaderboard

`grid` с фиксированными колонками, разделитель — `border-bottom: 0.5px solid var(--color-grey-80)`, у `:last-child` границу убрать. Header — `text-small-semibold` цвета `--color-grey-30`. Данные — `text-light-100`, числа — моноширинно.

### Селект (dropdown эпохи)

`h-40px`, фон `var(--color-grey-100)`, граница `0.5px var(--color-light-80)`, padding-left `12px`, шеврон в `var(--color-light-100)`. Радиус `4px`.

### Топ-нав

`flex` между логотипом слева и кнопками справа (`CONNECT WALLET` | `DOCS` | `EN`). Разделители между правыми кнопками — `|` цвета `--color-grey-70`. Высота шапки ~80px на desktop, горизонтальный padding 24px.

### Чарты

Donut: внутри центра — display-число + `ALLCAPS` подпись. Легенда справа, каждая строка — цветной dot 8px + название + значение в ETH строкой ниже.

---

## 6. Иконография

Логотип SVG: `viewBox 0 0 165 46`, fill `#fefdf4`, stroke `#0d0d0d 0.5px`. Иконки UI — 24px, fill наследуется от текущего color. Без жирных контуров, без скруглений.

---

## 7. Эффекты

- Transitions: `0.15s ease` для color/bg, `0.3s ease` для размеров
- Shadow elevation: `0 8px 16px 0 #0d0d0d33`
- Hover glow для accent элементов: `0 0 8px #ffca8040` (orange) / `0 0 8px #78f0e240` (teal)

---

## 8. Семантика цвета для аналитического отчёта

Так как контент — анализ проектов Octant, договариваемся о семантике inline-цветов в тексте:

| Сущность | Цвет | Использование |
|---|---|---|
| Эпохи (Epoch 11, Epoch 0) | `--color-orange-100` | номера и упоминания эпох |
| API / endpoints / Python | `--color-teal` | технические термины |
| Адреса кошельков (0x...) | `--color-pink` | моноширинный шрифт + цвет |
| Числа / суммы ETH | `--color-yellow` | акцент на значениях |
| Категории / metrics | `--color-green` | классификация |
| Цитаты / заметки | `--color-grey-30` | nota bene блоки |

Это даёт цветной читаемый отчёт в стиле родного app dashboard.
