# Kalvi Kalanjiyam (கல்வி களஞ்சியம்) — lesson format

Free, no-login learning for Tamil Nadu students, Classes 1–10. Three doors: **Understand** (lessons by class), **Project Coach** (`#/project`, guides a child through their own school project with questions, never answers; printable report) and **Future Thinkers** (`#/future`, AI / invention / tech side-effects).

Lesson flow (v2, research-informed — problem-first / productive failure, Singapore concrete→pictorial→abstract, Feynman self-explanation, retrieval practice): hook (story or mystery) → **predict** (guess first) → **discover** (play with a widget and find the rule before being told) → explanation & worked examples → practice with hints → **world** (where it’s used) → **invent** (build something with it; can be sent to the Project Coach) → **future** (how AI/tech uses it, the risk, the fix, a question) → **explain** (in your own words, keyword self-check) → summary → quiz. Each lesson carries a `curriculum` list showing where the idea sits in Samacheer, CBSE/NCERT and international syllabuses — a map for exams, not the organising principle.

- `index.html` — the whole engine (catalog view, lesson renderer, widgets, practice checking, quiz, progress in localStorage, Tamil/English switch).
- `catalog.json` — classes → subjects → chapters → lessons. Chapter titles follow the TN textbooks; a chapter with an empty `lessons` array shows as "coming soon".
- `lessons/<id>.json` — one file per lesson. Add its `{id, title}` to the right chapter in `catalog.json`.

Every user-visible string is `{"ta": "...", "en": "..."}`. Text supports `**bold**`, blank line = new paragraph, and a paragraph written as `[[ ... ]]` renders as a highlighted formula box.

Block types: `hook`, `predict` (`q`, `options`, optional `answer`, `reveal`), `discover` (`widget`, `params`, `text`, `q`, `options`, `correct`, `insight`), `world` (`items`: icon/title/text), `invent` (`title`, `text`, `prompts`), `future` (`text`, `risk`, `fix`, `q`), `explain` (`q`, `keywords` [{ta,en,alt}], `model`), `text`, `key`, `activity`, `summary` (`points`), `widget` (`name`, `params`), `example` (`q`, `steps`, `answer`), `try` (numeric: `answer`, `tol`, `unit`; or multiple choice: `options`, `correct`; plus `hint`, `solution`), `table` (`head`, `rows`). `quiz` is a list of `{q, options, correct, explain}`.

Widgets (in `index.html` → `WIDGETS`): `trigTriangle`, `shadow`, `special`, `unitCircle`, `heightDistance`, `motion`, `mole`, `reflex`, `aiTrainer` (k-nearest-neighbours mango classifier with a bias demo), `ideaSpinner` (object × SCAMPER).

Rules: explanations are written fresh (never copied from the textbook or guides); every numeric answer is checked independently before publishing; no AI and no fees on this page.

## Classes 1–5: game-based learning (`games-math.js`, `games-lang.js`, `play.js`)

Every Class 1–5 chapter (Samacheer term chapters; Ennum Ezhuthum skills for 1–3) holds **game** entries in `catalog.json`: `{id: 'g-…', title, game, level}`. Each game = Mayilu the peacock explains → an animated worked example → 10 rounds (choice or tap-to-sort) → stars. Wrong answers always show the correct answer and why.

- **Maths** questions are generated, never typed: the answer is computed from the same numbers that are drawn (blocks, clock hands, coins, fraction slices, bar graphs). Infinite fresh practice.
- **Tamil / English / Science / Social** use small curated, fact-checked datasets; Tamil words are stored pre-split into letters and verified by code (uyirmei = consonant + vowel sign).
- **Tests:** `node learn/tests/games.test.cjs` (env `N` = questions per game, default 3000) generates questions for every game at its catalog level and checks: answer present exactly once, no duplicate options, no `undefined/NaN`, the generator’s own check, an **independent re-computation from the question text** (45 arithmetic/time/Tamil games), and a **picture check** that what the child sees (emoji count, coins, blocks, clock hands, fraction slices, number sequence) matches the answer. Run it before every push.
- Chapters with no game yet (e.g. history-heavy Social chapters, "Air") show as "coming soon" rather than risk wrong facts.
