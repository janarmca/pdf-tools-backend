# Kalvi Kalanjiyam (கல்வி களஞ்சியம்) — lesson format

Free, no-login lessons for Tamil Nadu students (Samacheer Kalvi, Classes 1–10). Every lesson follows the same order: real-life hook → explanation → touch-and-play widget → worked examples → practice with hints → hands-on activity → summary → quiz.

- `index.html` — the whole engine (catalog view, lesson renderer, widgets, practice checking, quiz, progress in localStorage, Tamil/English switch).
- `catalog.json` — classes → subjects → chapters → lessons. Chapter titles follow the TN textbooks; a chapter with an empty `lessons` array shows as "coming soon".
- `lessons/<id>.json` — one file per lesson. Add its `{id, title}` to the right chapter in `catalog.json`.

Every user-visible string is `{"ta": "...", "en": "..."}`. Text supports `**bold**`, blank line = new paragraph, and a paragraph written as `[[ ... ]]` renders as a highlighted formula box.

Block types: `hook`, `text`, `key`, `activity`, `summary` (`points`), `widget` (`name`, `params`), `example` (`q`, `steps`, `answer`), `try` (numeric: `answer`, `tol`, `unit`; or multiple choice: `options`, `correct`; plus `hint`, `solution`), `table` (`head`, `rows`). `quiz` is a list of `{q, options, correct, explain}`.

Widgets (in `index.html` → `WIDGETS`): `trigTriangle`, `shadow`, `special`, `unitCircle`, `heightDistance`, `motion`, `mole`, `reflex`.

Rules: explanations are written fresh (never copied from the textbook or guides); every numeric answer is checked independently before publishing; no AI and no fees on this page.
