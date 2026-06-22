# HANDOFF — Tara! (Learn Tagalog)

Working notes for continuing this project in a fresh session.
See **`BACKLOG.md`** for the issues checklist, idea parking lot, and the
written specs of shipped features (e.g. the economy redesign).

## What this is
A gamified, mobile-first **PWA** that teaches Tagalog/Filipino to English
(Canadian) speakers. Vanilla HTML/CSS/ES-modules — **no build step** —
deployed via GitHub Pages.

- **Repo:** `ktabuli/tara` (renamed from `ktabuli.github.io`)
- **Dev branch:** `claude/tagalog-learning-app-getabw` (all work pushed here)
- **`main`:** up to date — the dev branch was merged in (PRs #1, #2). A fresh
  clone of `main` is complete; you can develop on `main` or the dev branch.
- **Live URL:** `https://ktabuli.github.io/tara/` (Pages serves the repo at the `/tara/` path)
- **Deploy:** this remote env's git proxy blocks pushes to `main`; pushes go to
  the dev branch, then `main` is synced via a GitHub-API PR + merge. GitHub
  Pages was set by the user to deploy from the dev branch.

## Run / test / deploy
```bash
node --test            # 37 unit tests (node's built-in runner, no deps)
npm run smoke          # headless boot/render check of app.js (tests/smoke.mjs)
python3 -m http.server 8000   # local preview at http://localhost:8000
```
- `package.json` sets `"type":"module"` + `test` and `smoke` scripts.
- CI: `.github/workflows/test.yml` runs `node --test` **and** the smoke test on
  push/PR. (Smoke stubs a minimal DOM so app.js loads under Node — it provides
  a `navigator` stub because Node < 21 has none.)
- **Service worker cache:** bump `CACHE` in `service-worker.js` (currently
  `tara-tagalog-v24`) on EVERY change to assets, or users get stale files.
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
- `assets/js/store.js` — localStorage state + `ACHIEVEMENTS` (12). XP/level,
  **gems** (accumulating; base 15; `spendGems`), streak (any lesson/day),
  per-part completion, mistakes, `unitTests` (+ `unitTestTaken`), `checkpoints`
  (pass = ≥30%), `cooldowns` map (`setCooldown`/`cooldownRemaining`/
  `clearCooldown`), `completeLesson`/`practiceResult`/`unitTestResult`/
  `checkpointResult`. **Hearts are NOT here** — they're per-node, in the player.
- `assets/js/app.js` — all UI/screens + players. `GATES` = ordered unlock chain
  (parts + required halfway checkpoint + **required unit test** + cumulative
  checkpoint). Per-node hearts/skip live in `runPart`; `modal()` powers the
  out-of-hearts + cooldown popups; `renderSkip` is the "I don't know" control;
  a live countdown updates cooldown nodes on Home. Screens: home(path),
  dashboard, history(Review), rewards, profile.
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

### Economy (per-node challenge model — see BACKLOG spec)
- **Hearts:** 3 per node, ephemeral (no global pool / no passive regen). Each
  mistake −1. At 3 mistakes a popup offers **10 gems → refill & resume in place**
  or **End**. Ending fails the node (restart on retake) and sets a **5-min retry
  cooldown** (live countdown on Home); the locked node offers **10 gems → skip
  the wait**. Resume-in-place is live (no saved snapshot).
- **Skips:** **1 per node**, fresh each attempt, non-accumulating. "I don't know"
  reveals the answer with **no heart lost**, counts as not-correct, logs the word
  to Review. Not available in checkpoints/unit tests.
- **Gems:** accumulating; **base 15**; earned on completion by stars (3/2/1 =
  5/3/1); spent only on the two 10-gem options. Shown in top bar / Rewards /
  Profile.
- **Required checkpoints (gated via `GATES`):** *Halfway* (inside each unit, gates
  2nd half) + *Cumulative* (after every 2 units, gates next unit). Heart-free, no
  skips, **pass = ≥30%**, 🧠 result, tracked in `store.checkpoints`.
- **Unit Test** at each unit end — **required to advance** but **any score clears
  the gate**; heart-free, no skips; shows best-% + **medal ranking** (🥇≥95 /
  🥈≥80 / 🥉≥60) to motivate retakes → `store.unitTests`.
- **Review tab** = glossary (grouped by unit; search >30 words; tap to hear),
  mistakes to review, skills, Helper-words reference, and practice drills.

## Conventions
- Commit footer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
  `Claude-Session: <session url>`
- Don't put the model id in repo artifacts.
- After content/asset edits: bump SW cache + run `node --test`.

## Open ideas / not done
See `BACKLOG.md` for the full list. Highlights still open:
- 🔴 **No recorded audio** → TTS mispronounces (English voice reading Tagalog).
  User will send `.mp3`s later (drop in `assets/audio/`, rerun the manifest
  script; "recorded" chip + playback already wired). Interim: an "audio is
  approximate" note when no Filipino voice exists.
- 🔴 **Speaking exercises are a no-op on Safari/Firefox** (no `SpeechRecognition`).
- Native-speaker pass on pronunciations/spellings in `curriculum.js`.
- Possible softeners for the harder economy (heartless intro, etc.), richer Unit
  Test, sound effects. Design work may be bridged to Figma via a plugin (no
  direct Figma integration in this env).
