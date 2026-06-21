# BACKLOG — Tara! (Learn Tagalog)

Living checklist of issues to fix + a parking lot for ideas. Pair with
`HANDOFF.md` (architecture/run notes). Check items off as they ship; move
graduated ideas up into "Issues" when committed to.

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
- [ ] **Running out of hearts wipes in-progress part.** Lesson parts cost a heart
      per wrong answer; hitting 0 mid-part restarts from the tip with nothing
      saved. Brutal on lesson 1 for a true beginner.
      → Save mid-part progress, and/or make the *first* lesson heartless.
      *(app.js `runPart`/`outOfHearts`, `store.loseHeart`.)*
- [ ] **No "skip / I don't know" escape hatch.** Stuck on a cloze/write exercise,
      the only path is guess-and-lose-a-heart. (Already noted in HANDOFF as
      "skip after N tries".)
      → Offer a reveal/skip after N wrong attempts (no heart on skip).
- [ ] **Readings quiz untaught words.** U3 jeepney ("**Trenta** pesos") and U5
      market ("**Singkwenta** pesos") expect decoding numbers never taught
      (only Isa/Dalawa/Tatlo exist). Contradicts the "only quiz taught words"
      rule.
      → Teach the Spanish-derived numbers, or pick passages using taught vocab.
      *(curriculum.js u3l2 / u5l1 readings.)*

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
