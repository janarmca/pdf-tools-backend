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

### Beyond Samacheer (Classes 1–5)
Each class also has **🧠 Thinking Lab** (robot coding, patterns, balance algebra, multiples, magic squares, logic), **❤️ Life & Values** (Tamil relation names, caring for parents/grandparents/elders, helping at home), **🇮🇳 My Nation & Me** (symbols, national days, civics, democracy, India's science achievements — non-partisan, no current office-holders) and **🗣️ More Languages** (Hindi letters/numbers/words, Tamil–Hindi–English words, greetings in 11 languages), all in `games-think.js`. Class 5 adds **🚀 Beyond the Textbook** lessons (`eratosthenes`, `think-like-coder`, `power-of-vote`) with widgets `eratosthenes`, `robotProgram`, `classVote`. The test re-solves every Thinking-Lab puzzle independently (robot simulation, magic-square line sums, balance, sequence rules, logic ordering) and checks Hindi letters and greeting scripts by Unicode block.

## Classes 6–8 (`games-mid.js`, `games-mid2.js`)
Every chapter in Tamil, English, Maths, Science and Social is filled with games, plus Thinking Lab, Life & Values (money sense, online safety, caring for elders), My Nation & Me, More Languages and one Beyond-the-Textbook lesson per class (`zero-place-value`, `why-ships-float`, `baudhayana-theorem` with the `pythagoras` widget).
- **Maths & science calculations are generated** (integers, fractions/rational numbers, decimals, HCF/LCM, primes, Roman numerals, Indian/International numbers, ratio, direct/inverse proportion, percent, profit & loss, simple & compound interest, speed, time & work, equations, expressions, exponents, roots, angles, polygons, area/volume, mean/median/mode, pressure/density, °C/°F/K, longitude & time). `tests/games.test.cjs` re-solves every one of them from the question text with separate code (exact rational/BigInt arithmetic, brute-force equation solving).
- **Facts are small curated sets** (SI units, acids/bases, cell, deficiency diseases, microbes, elements, planets, capitals, monuments, excavations, river sources, latitudes, Constitution, sectors, farm revolutions, Tamil literature, language families). Contested items are left out (e.g. states with disputed capitals).

## Classes 9–10 (`games-high.js`, `games-high2.js`)
The Samacheer chapter lists (maths 9 / 8 chapters, science 27 / 23 chapters) and the existing lessons (trigonometry, motion, mole concept, reflex action, heights & distances) are kept; every chapter now also has games. Tamil (vetrumai, literature history), English (passive voice, question tags, verb forms), Social Science (world history, freedom struggle, rocks, atmosphere, soils, crops, rivers, Constitution, world bodies, taxes), Thinking Lab, Life & Values, My Nation & Me, More Languages and Beyond lessons (`rice-chessboard` with the `doubling` widget, `birthday-surprise` with the `birthday` widget) were added.
Generated: sets, surds, scientific notation, recurring decimals, modular arithmetic, AP/GP, remainder theorem, factorising, quadratic roots & discriminant, simultaneous equations, identities, circle theorems, coordinate geometry, BPT/similar triangles, tangents, trig values, heights & distances, solids, Heron, probability, SD/CV, equations of motion, force/energy/power, electricity & bills, waves/lenses/heat, fluid pressure, half-life, molar mass & moles, atomic structure/configuration/valency, pH, concentration, alkanes, binary, Punnett squares — each re-solved independently in `tests/games.test.cjs` (polynomial parser, brute-force solvers, exact enumeration of dice/cards/coins, own atomic-mass table).

## ஆய்வகம் (Lab) & Books — `lab.js`
- Our OWN experiments (no PhET/BYJU'S code or content): 28 now (lab.js = first 14, lab2.js = 14 more + the 'why learn this' notes `WHY`). Every experiment must have a `why` {l: daily life, j: careers, h: think-about-it} so students see the purpose. Flow: predict → do & record (min 3 readings) → understand (rule) → check (2 questions; score saved under `lab-<id>` in `kalviProgress`).
- To add one: push an object to `EXPS` in lab.js: `{id, icon, c:[minClass,maxClass], s:'maths|physics|chem', t, goal, predict:{q,o,a,why}, build(ctx){...return {cols, rec}}, key, quiz}`. Put pure formulas in `PHYS` and test them. Every text is [ta,en].
- `#/books` = link-only list of free official textbooks. Never copy their content.
- Tests: Playwright script mounts every experiment, records, answers the quiz (see session notes).

## games-sci.js — "Learn by doing" games (27)
Computed-answer science and real-life maths games for Classes 6–10 (speed, Hooke, density, pressure, Ohm, electricity bill,
seesaw, energy, echo, work/power, atom, formula atoms, moles, pH, equations, separation, food chains, heredity, heart,
microscope, nutrition kcal, germ doubling, photosynthesis, best buy, percent, map scale, mileage).
Each has a "why" intro and an explanation on every mistake. ~28,000 distinct questions (measured). Independent re-solvers
live in tests/games.test.cjs. Catalog chapters: "🎮 செய்து புரிந்துகொள்" (science) and "🛒 நிஜ வாழ்க்கைக் கணக்கு" (maths).
`#/what` page = "What is Maths / Physics / Chemistry / Biology?".

## missions.js — 🎯 "Hit the target" mission games (11)
Route `#/missions`. One slider, live result, random target, 5 rounds, 3 stars, a "why this matters" note at the end.
Projectile, spring, seesaw, Ohm, pendulum, gas, refraction, Pythagoras, recipe ratio, interest, wave.
Every round is solvable on the slider grid (browser-tested: 11 missions x 3 plays x 5 rounds).

## why.js — "Why do we learn this?" banner on every subject page, Classes 1-10 (Tamil + English).
