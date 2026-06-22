# BACKLOG — Tara! (Learn Tagalog)

Living checklist of issues to fix + a parking lot for ideas. Pair with
`HANDOFF.md` (architecture/run notes). Check items off as they ship; move
graduated ideas up into "Issues" when committed to.

---

## 🧭 Economy redesign — ✅ SHIPPED (v24) (supersedes the skip-as-currency change)

Reworks hearts / skips / gems into a per-node challenge model with a global
gem economy. **This reverses the recent "replace gems with skips" change**:
gems come back as the accumulating currency; skips become a per-node allowance.
"Node" = one playable path node (a lesson **part**, the unit of a play session).

### Skips (per-node safety valve)
- **1 skip per node**, granted fresh at the start of every node. Does **not**
  accumulate or carry between nodes; unused skips are lost. Retaking a node
  grants a fresh skip.
- "I don't know" button on a scored question: reveal the answer, **no heart
  lost**, counts as **not-correct**, logs the word to Review. Disabled once the
  node's single skip is used.
- **Not available** in checkpoints or unit tests.

### Hearts (per-node, ephemeral)
- **3 hearts per node**, fresh every attempt. Each mistake −1. Hearts are
  purely in-session — **no global pool, no passive 25-min regen** (remove that).
- **3 mistakes → out-of-hearts popup**, mid-node:
  - **[Use 10 gems → refill & continue]** — refill to 3 and **resume in place**
    (live session continues; no saved snapshot needed). Disabled if <10 gems.
  - **[End]** — node fails (incomplete), exit to Learn.
- On **End/fail**: the node gets a **5-minute retry cooldown** (store a
  `cooldownUntil` timestamp per node). Retaking restarts the node from scratch
  with 3 fresh hearts.
- Checkpoints & unit tests are **heart-free** (see below).

### Cooldown (Learn page)
- A node in cooldown shows **locked + "Retry in m:ss"** (live countdown).
- Tapping it offers **[Pay 10 gems to skip the cooldown]** (unlocks now; still
  retakes from scratch). Disabled if <10 gems.

### Gems (accumulating currency)
- **Base 15 gems** on a fresh start (one rescue affordable immediately).
- Earned on **node completion**, scaled by stars (3★=5 / 2★=3 / 1★=1) — as
  originally.
- Spent **only** on the two 10-gem options above (resume-in-place /
  skip-cooldown). Shown in the top stats bar + Rewards + Profile.

### Unit tests (now REQUIRED, always pass-through)
- Joins the unlock chain: you must **take** the unit's test to proceed, but
  **any score clears the gate** (no 80% requirement to advance).
- **Heart-free, no skips.** Pure %-scored.
- Show a **visual ranking**: best % + a medal by tier (reuse star tiers:
  ≥95% 🥇 / ≥80% 🥈 / ≥60% 🥉 / else show %). Encourages voluntary retakes for
  100% without forcing it.
- Keep `unit_master` / `graduate` achievements meaning **≥80%** (optional
  excellence, no longer a gate).

### Checkpoints (gated by score, heart-free)
- **Heart-free, no skips** (unchanged in play).
- **<30% → does not pass**; must retake to unlock what's beyond. ≥30% clears
  the gate. (Applies to both halfway and cumulative checkpoints.)

### UI/structure consequences
- Top stats bar: **streak · gems · level** (remove the global hearts chip;
  hearts now live only inside the node player). Remove the standalone Hearts
  screen + `hearts` route.
- `GATES` chain per unit becomes: first-half parts → halfway checkpoint →
  second-half parts → **unit test (required)** → cumulative checkpoint (every
  2nd unit) → next unit.
- Store: drop global hearts/regen; add `gems`, `cooldowns` map; checkpoint
  `done` requires ≥30%; keep `unitTests` best %. Update store tests.

---

## 🐞 Issues to fix

Severity: 🔴 breaks the core promise · 🟠 hurts the beginner on-ramp · 🟡 polish/trust.

### 🔴 Core learning broken
- [ ] **Audio mispronounces words (no recordings).** `manifest.json` is empty, so
      `speak()` falls back to Web Speech TTS with `lang:"fil-PH"`. Most devices
      have no Filipino voice, so `pickVoice()` reads Tagalog with an English
      voice — teaching the *wrong* pronunciation, confidently. Auto-plays on
      every teach card.
      → Real recordings are the fix. Interim: detect "no Filipino voice"
      (`pickVoice()` returned a non-`fil/tl/ph` voice) and show an "audio is
      approximate" note instead of silently mispronouncing.
      *(lessons.js `pickVoice`/`ttsSpeak`; teach auto-play in app.js `renderTeach`.)*
- [ ] **Speaking exercises are a no-op on Safari/Firefox.** `webkitSpeechRecognition`
      is Chrome/Edge-only. On unsupported browsers the "speak" step shows
      *"I said it ✓"* and passes regardless of what's said — fake progress that
      still counts toward the "Speaking" skill tally.
      → Relabel as self-check, or gate/skip scoring when `canListen()` is false.
      *(app.js `renderExercise` → `speak` branch; dashboard skill counts.)*

### 🟠 Beginner on-ramp
- [x] **Running out of hearts wipes in-progress part.** ~~hitting 0 mid-part
      restarts from the tip with nothing saved.~~ Addressed by the v24 economy
      redesign: at 3 mistakes a popup offers **10 gems → refill & resume in
      place** (no progress lost). Choosing *End* fails the node (restart on
      retake) and starts a 5-min cooldown that 10 gems can also skip. One free
      skip per node further softens it. *(Optional future: a heartless intro.)*
- [x] **No "skip / I don't know" escape hatch.** Shipped (final form in v24):
      **1 skip per node** (fresh each attempt, non-accumulating). The "I don't
      know" button reveals the answer with **no heart lost** and logs the word
      to Review. Not available in checkpoints/unit tests.
      *(store.js skips/useSkip; app.js `renderSkip`/`feedbackBar`/`runPart`.)*
- [x] **Readings quiz untaught words.** ~~U3 jeepney ("**Trenta** pesos") and U5
      market ("**Singkwenta** pesos") expect decoding numbers never taught.~~
      Fixed: U3l2's fare question now tests "Bayad po / Para po!" (both taught).
      On inspection U5l1 ("What does the shopper ask for?" → Tawad) and U5l2
      (→ Hapon) already derived their answers from taught vocab — the untaught
      numbers were flavour only, translated on reveal, never quizzed.
      *(curriculum.js u3l2 reading.)*

### 🟡 Polish & trust
- [ ] **"Mabuhay" is never glossed.** The home banner greets with a word the
      learner hasn't been taught. Add an inline gloss/tooltip ("Welcome!").
      *(app.js `renderHome` hero.)*
- [ ] **Native-speaker content pass.** Verify stress marks (e.g. "ku-mus-TA"),
      informal Taglish spellings ("Nami-miss"), and glosses across
      `curriculum.js`. (HANDOFF flags pronunciations need user corrections.)
- [ ] **"Build a sentence" accepts only one word order.** Tagalog word order
      (and *po* placement) is flexible; valid reorderings are marked wrong.
      → Accept known-good alternates, or constrain to sentences with one
      natural order. *(lessons.js `makeBuild`, `checkAnswer`.)*
- [ ] **Accessibility gaps.** Icon-only buttons (🔊 speaker, mic, ✕ quit) lack
      `aria-label`s; viewport sets `user-scalable=no` (blocks pinch-zoom).
      *(app.js exercise/teach render; index.html viewport meta.)*
- [ ] **Match pairs can't be failed** → free XP inflates accuracy. By design,
      but consider not counting it toward scored accuracy.
- [ ] **No personalization.** Profile is hard-coded "Tagalog Learner".

---

## 💡 Ideas parking lot

Not committed — promote to "Issues" when we decide to build.

### Content & pedagogy
- [ ] **Spaced repetition** for the Review hub (resurface words on a decay
      schedule instead of "everything learned").
- [ ] **Expand the course** — more units/lessons, more vocab per theme.
- [ ] **Teach the number system** properly (native + Spanish-derived) as its
      own lesson; unblocks market/fare/time content.
- [ ] **Richer Unit Tests** — more varied question types, timed mode.

### Audio & speech
- [ ] **Recorded human audio pipeline** (user to supply `assets/audio/<slug>.mp3`,
      rerun the manifest script). Playback + "recorded" chip already wired.
- [ ] **Collapsible Helper-words card with tap-to-hear** inside exercises.
- [ ] **Per-syllable pronunciation playback / slow-mo** on teach cards.

### Engagement & gamification
- [ ] **Onboarding flow** — name, "why Tagalog", daily-goal picker.
- [ ] **Sound effects** (correct/wrong/level-up) — respect a mute toggle.
- [ ] **Streak freeze / weekend amnesty** so a missed day doesn't sting.
- [ ] **Heart mechanics tuning** — gentler early, or a practice-to-earn-hearts loop.
- [ ] **Leaderboards / shareable progress** (optional, privacy-aware).

### Platform & polish
- [ ] **Install prompt / PWA "add to home screen"** nudge.
- [ ] **Dark mode.**
- [ ] **Settings:** toggle auto-play audio, choose TTS voice when multiple exist.
- [ ] **Offline-first audit** beyond the service worker (test true offline run).

---

_Conventions: after content/asset edits, bump the SW `CACHE` in
`service-worker.js` and run `node --test`. See `HANDOFF.md`._
