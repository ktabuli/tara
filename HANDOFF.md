# HANDOFF — Tara! (Learn Tagalog)

Working notes for continuing this project in a fresh session.

## What this is
A gamified, mobile-first **PWA** that teaches Tagalog/Filipino to English
(Canadian) speakers. Vanilla HTML/CSS/ES-modules — **no build step** —
deployed via GitHub Pages.

- **Repo:** `ktabuli/tara` (renamed from `ktabuli.github.io`)
- **Dev branch:** `claude/tagalog-learning-app-getabw` (all work pushed here)
- **Live URL:** `https://ktabuli.github.io/tara/` (Pages serves the repo at the `/tara/` path)
- **Deploy:** the env's git proxy blocks pushes to `main`; pushes go to the
  dev branch. The GitHub **API** (MCP tools) *can* write other branches.
  GitHub Pages was set by the user to deploy from the dev branch.

## Run / test / deploy
```bash
node --test            # 35 unit tests (node's built-in runner, no deps)
python3 -m http.server 8000   # local preview at http://localhost:8000
```
- `package.json` only sets `"type":"module"` + a `test` script.
- CI: `.github/workflows/test.yml` runs `node --test` on push.
- **Service worker cache:** bump `CACHE` in `service-worker.js` (currently
  `tara-tagalog-v21`) on EVERY change to assets, or users get stale files.
  SW is network-first for same-origin so updates land after one reload.

## File map
- `index.html` — shell; loads Catamaran font; registers SW.
- `assets/js/curriculum.js` — **single source of truth** for content:
  6 units × 2 lessons (12 lessons). Each lesson: `vocab[]` ({tl,en,say,emoji}),
  `tip`, `sentences[]`, `reading`, `quiz`. Unit colours are soft palette tints.
- `assets/js/lessons.js` — engine: `lessonParts` (splits lessons into ~3-word
  parts), `allParts` (24 parts, each with cumulative `known` words),
  `buildSteps` (interleaved lesson sequence), `practiceSteps`, `unitTestSteps`,
  `checkpointSteps(known,sentences,{vocab,matches,focus})`, `checkAnswer`,
  `speak`/`listen` (Web Speech + recorded-audio fallback), `audioSlug`,
  `helperNotes`/`helperGlossary` (particle glosses), `PARTICLE_GLOSS`.
- `assets/js/store.js` — localStorage state + `ACHIEVEMENTS`. XP/level/gems/
  hearts (regen), streak (any lesson/day), per-part completion, mistakes,
  `unitTests`, `checkpoints`, `completeLesson`/`practiceResult`/
  `unitTestResult`/`checkpointResult`.
- `assets/js/app.js` — all UI/screens + players. `GATES` = ordered unlock
  chain (parts + required checkpoints). Screens: home(path), dashboard,
  history(Review), rewards, profile, hearts.
- `assets/js/icons.js` — inlined **Hugeicons** (stroke-rounded, currentColor).
  Add icons by pasting inner SVG into `PATHS`.
- `assets/css/style.css` — palette in `:root`; mobile-first.
- `assets/audio/` — drop `<slug>.mp3` (see `FILENAMES.md`); run
  `node scripts-gen-audio-manifest.mjs` to refresh `manifest.json` (drives the
  "recorded" chip + audio playback). Currently empty (no recordings yet).

## Design system
- **Palette:** Sunflower Gold `#FFBC42`, Teal `#087E8B`, Vibrant Coral `#FF5A5F`,
  White `#FEFDFF`, Charcoal `#2A2C24`. Font: **Catamaran**.
- **Icons:** coloured stroke outlines (teal default; coral hearts/streak; gold
  level). **Text is charcoal.** Units are colour-coded with soft tints; a
  luminance `fg()` keeps text readable on light tints.

## Learning flow (key mechanics)
- Lessons split into bite-sized **parts**; each part: tip → recap → (flashcard
  → game) per word → fill-blank → build → match → reading → recap → quiz.
  Exercise types/order **randomized each start**; same words every time.
- **Only ever quiz taught words** — distractors/cloze/recap use each part's
  cumulative `known` set (no untaught content). Fill-blank only blanks a taught
  word; sentence exercises show a **Helper words** footnote for particles.
- **Translations hidden during tests** (reading/cloze), revealed after answering.
- **Match** always reads as correct once completed (can't finish until right).
- **Required checkpoints (gated via `GATES`):**
  - *Halfway* checkpoint inside each unit (emphasised big circle node) — gates
    the unit's 2nd half.
  - *Cumulative* checkpoint after every 2 units (banner) — gates the next unit.
  - Both: no hearts, 🧠 result screen, tracked in `store.checkpoints`.
- **Unit Test** at each unit end (optional, 80% to pass) → `store.unitTests`.
- **Review tab** = glossary (grouped by unit; search >30 words; tap to hear),
  mistakes to review, skills, Helper-words reference, and practice drills.

## Conventions
- Commit footer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
  `Claude-Session: <session url>`
- Don't put the model id in repo artifacts.
- After content/asset edits: bump SW cache + run `node --test`.

## Open ideas / not done
- User will send **recorded audio** later (drop in `assets/audio/`, rerun the
  manifest script). The "recorded" chip + playback are already wired.
- Pronunciations/spellings may still need the user's corrections in `curriculum.js`.
- Possible next: collapsible Helper-words card + tap-to-hear; "skip after N
  tries" escape hatch for required checkpoints; richer Unit Test; sound effects.
