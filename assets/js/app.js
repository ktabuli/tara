/* =====================================================================
 * app.js — Tara! Learn Tagalog  (main application)
 * ---------------------------------------------------------------------
 * Mobile-first PWA. Renders all screens and runs the interleaved,
 * bite-sized lesson player (flashcards mixed with games).
 * ===================================================================== */

import { COURSE, allLessons, unitById } from "./curriculum.js";
import { store, ACHIEVEMENTS } from "./store.js";
import {
  allParts, partById, buildSteps, practiceSteps, unitTestSteps, checkAnswer,
  speak, listen, canListen, canSpeak, shuffle, audioSlug, helperGlossary
} from "./lessons.js";
import { icon } from "./icons.js";

const app = document.getElementById("app");
const POOL = allLessons().flatMap((l) => l.vocab);   // distractor pool
const PARTS = allParts();
const state = { route: "home" };

/* slugs of words that have a recorded audio file (assets/audio/manifest.json) */
let RECORDED = new Set();
function loadRecorded() {
  fetch("assets/audio/manifest.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => { RECORDED = new Set(list); if (state.route === "history") render(); })
    .catch(() => {});
}

/* ---------- helpers ---------- */
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function go(route) { state.route = route; render(); window.scrollTo({ top: 0 }); }

/* readable foreground (charcoal or white) for a given background colour */
function fg(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#2A2C24" : "#FEFDFF";
}

/* track which vocab words were missed (for the Review hub) */
function noteWord(ex, ok) {
  if (!ex || !ex.word) return;
  if (ok) store.clearMistake(ex.word.tl); else store.recordMistake(ex.word);
}

/* unique vocab from every completed part */
function learnedWords() {
  const seen = new Map();
  for (const p of PARTS) if (store.isCompleted(p.id)) for (const w of p.words) if (!seen.has(w.tl)) seen.set(w.tl, w);
  return [...seen.values()];
}

/* learned vocab grouped by unit (each word listed under the unit it was first learned) */
function learnedByUnit() {
  const seen = new Set();
  const groups = [];
  const byId = {};
  for (const p of PARTS) {
    if (!store.isCompleted(p.id)) continue;
    for (const w of p.words) {
      if (seen.has(w.tl)) continue;
      seen.add(w.tl);
      if (!byId[p.unitId]) { byId[p.unitId] = { title: p.unitTitle, words: [] }; groups.push(byId[p.unitId]); }
      byId[p.unitId].words.push(w);
    }
  }
  return groups;
}

const SKILL_ICON = { reading: icon("reading"), writing: icon("writing"), speaking: icon("speaking"), listening: icon("listening") };
const UNIT_ICON = { u1: "chat", u2: "group", u3: "bus", u4: "dining", u5: "cart", u6: "hearts" };

/* part index helpers (for unlock + progress) */
function partIndex(id) { return PARTS.findIndex((p) => p.id === id); }
function isUnlocked(id) { const i = partIndex(id); return i === 0 || (i > 0 && store.isCompleted(PARTS[i - 1].id)); }

/* =====================================================================
 * Top stats bar + bottom tab bar
 * ===================================================================== */
function statsBar() {
  const s = store.state;
  return `
    <header class="topbar">
      <div class="stat s-streak" title="Day streak"><span class="stat-ico">${icon("streak", { size: 20 })}</span><span class="stat-val">${s.streak}</span></div>
      <div class="stat s-gems" title="Gems"><span class="stat-ico">${icon("gems", { size: 20 })}</span><span class="stat-val">${s.gems}</span></div>
      <div class="stat hearts" data-act="hearts" title="Hearts"><span class="stat-ico">${icon("hearts", { size: 20 })}</span><span class="stat-val">${store.hearts}</span></div>
      <div class="stat level-pill" title="Level ${store.level()}"><span class="stat-ico">${icon("level", { size: 20 })}</span><span class="stat-val">Lv ${store.level()}</span></div>
    </header>`;
}
function tabBar(active) {
  const tabs = [["home", "home", "Learn"], ["dashboard", "stats", "Stats"], ["history", "history", "History"], ["rewards", "rewards", "Rewards"], ["profile", "profile", "Profile"]];
  return `<nav class="tabbar">${tabs.map(([r, ic, l]) =>
    `<button class="tab ${active === r ? "active" : ""}" data-route="${r}"><span class="tab-ico">${icon(ic, { size: 26 })}</span><span class="tab-label">${l}</span></button>`).join("")}</nav>`;
}

/* =====================================================================
 * HOME — learning path (one node per bite-sized part)
 * ===================================================================== */
function renderHome() {
  const s = store.state;
  const goalPct = Math.round(store.todayProgress() * 100);

  const unitsHtml = COURSE.units.map((unit, ui) => {
    const parts = PARTS.filter((p) => p.unitId === unit.id);
    const nodes = parts.map((p, li) => {
      const done = store.isCompleted(p.id);
      const stars = store.lessonStars(p.id);
      const unlocked = isUnlocked(p.id);
      const offset = li % 2;
      const label = p.partCount > 1 ? `${p.title} · ${p.part}` : p.title;
      return `
        <button class="node ${done ? "done" : unlocked ? "ready" : "locked"} pos-${offset}"
                data-part="${p.id}" ${unlocked ? "" : "disabled"} style="--unit-color:${unit.color}">
          <span class="node-circle" style="${unlocked && !done ? `color:${fg(unit.color)}` : ""}">${done ? icon("check", { size: 34 }) : unlocked ? (SKILL_ICON[p.skill] || icon("reading")) : icon("lock", { size: 28 })}</span>
          <span class="node-stars">${"★".repeat(stars)}${"☆".repeat(done ? 3 - stars : 0)}</span>
          <span class="node-title">${esc(label)}</span>
        </button>`;
    }).join("");

    // Unit test — final assessment, unlocks once every part in the unit is done
    const allDone = parts.every((p) => store.isCompleted(p.id));
    const passed = store.unitTestPassed(unit.id);
    const best = store.unitTestBest(unit.id);
    const utCls = !allDone ? "locked" : passed ? "passed" : "ready";
    const utSub = !allDone ? "Finish the lessons to unlock"
      : passed ? `Passed${best ? ` · best ${best}%` : ""} — tap to retake`
      : "Test everything in this unit";
    const utHtml = `
      <button class="unit-test ${utCls}" data-unittest="${unit.id}" ${allDone ? "" : "disabled"}>
        <span class="ut-ico">${!allDone ? icon("lock", { size: 22 }) : passed ? icon("check", { size: 24 }) : icon("rewards", { size: 24 })}</span>
        <span class="ut-main"><span class="ut-title">Unit Test</span><span class="ut-sub">${utSub}</span></span>
      </button>`;

    return `
      <section class="unit">
        <div class="unit-banner" style="background:${unit.color};color:${fg(unit.color)}">
          <div><div class="unit-kicker">UNIT ${ui + 1} · ${esc(unit.subtitle)}</div>
          <div class="unit-name">${icon(UNIT_ICON[unit.id] || "reading", { size: 24 })} ${esc(unit.title)}</div></div>
        </div>
        <div class="path">${nodes}</div>
        ${utHtml}
      </section>`;
  }).join("");

  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <div class="hero-card">
        <div class="hero-mascot">🐃</div>
        <div class="hero-text">
          <h1>Mabuhay! 🇵🇭</h1>
          <p>${s.streak > 0 ? `You're on a ${s.streak}-day streak — keep it up!` : "Let's learn some Tagalog today."}</p>
        </div>
      </div>
      <div class="goal-card">
        <div class="goal-top"><span>Daily goal</span><span>${s.todayXp} / ${store.dailyGoal()} XP</span></div>
        <div class="bar"><div class="bar-fill" style="width:${goalPct}%"></div></div>
      </div>
      ${unitsHtml}
      <div class="footer-note">Made with ❤️ for Tagalog learners</div>
    </main>
    ${tabBar("home")}`;
}

/* =====================================================================
 * LESSON PLAYER — interleaved steps (teaching + games)
 * ===================================================================== */
function startPart(partId) {
  if (store.hearts <= 0) { go("hearts"); return; }
  const part = partById(partId);
  if (!part) return go("home");
  runPart(part, buildSteps(part, POOL));
}

function runPart(part, steps) {
  let i = 0, correct = 0;
  const scored = steps.filter((s) => s.type !== "teach" && s.type !== "tip").length;

  function shell(inner) {
    const pct = Math.round((i / steps.length) * 100);
    app.innerHTML = `
      <div class="lesson-shell">
        <div class="lesson-top">
          <button class="icon-btn" data-act="quit">✕</button>
          <div class="bar lesson-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="hearts-mini">${icon("hearts", { size: 20 })} ${store.hearts}</div>
        </div>
        <div class="lesson-body" id="exbody"></div>
        <div class="lesson-foot" id="exfoot"></div>
      </div>`;
    app.querySelector('[data-act="quit"]').onclick = () => { if (confirm("Quit this lesson? Progress in it won't be saved.")) go("home"); };
    return { body: app.querySelector("#exbody"), foot: app.querySelector("#exfoot") };
  }

  function loseLife() {
    store.loseHeart();
    const hm = app.querySelector(".hearts-mini");
    if (hm) { hm.innerHTML = `${icon("hearts", { size: 20 })} ${store.hearts}`; hm.classList.remove("lost"); void hm.offsetWidth; hm.classList.add("lost"); }
  }

  function next(wasCorrect) {
    if (wasCorrect) correct++;
    if (store.hearts <= 0) return outOfHearts(part);
    i++; paint();
  }

  function paint() {
    if (i >= steps.length) return finishPart(part, correct, scored);
    const step = steps[i];
    const { body, foot } = shell();
    if (step.type === "tip") return renderTip(step.tip, body, foot, () => { i++; paint(); });
    if (step.type === "teach") return renderTeach(step.word, body, foot, () => { i++; paint(); });
    renderExercise(step, body, foot, next, loseLife);
  }
  paint();
}

/* ---------- non-scored teaching steps ---------- */
function renderTip(tip, body, foot, onNext) {
  body.innerHTML = `
    <div class="ex-prompt">${icon("tip")} Culture tip</div>
    <div class="tip-card">
      <div class="tip-emoji">${icon("tip", { size: 44 })}</div>
      <div class="tip-title">${esc(tip.title)}</div>
      <div class="tip-body">${esc(tip.body)}</div>
    </div>`;
  foot.innerHTML = `<button class="btn btn-primary" data-act="go">Got it →</button>`;
  foot.querySelector('[data-act="go"]').onclick = onNext;
}

function renderTeach(w, body, foot, onNext) {
  body.innerHTML = `
    <div class="ex-prompt">Learn this word</div>
    <div class="teach-card">
      ${w.emoji ? `<div class="teach-emoji">${w.emoji}</div>` : ""}
      <div class="teach-tl">${esc(w.tl)}</div>
      <button class="speaker-sm" data-act="play">${icon("audio",{size:18})} Hear it</button>
      ${w.say ? `<div class="teach-say">${esc(w.say)}</div>` : ""}
      <div class="teach-arrow">means</div>
      <div class="teach-en">${esc(w.en)}</div>
    </div>`;
  foot.innerHTML = `<button class="btn btn-primary" data-act="go">Got it →</button>`;
  body.querySelector('[data-act="play"]').onclick = () => speak(w.tl);
  foot.querySelector('[data-act="go"]').onclick = onNext;
  setTimeout(() => speak(w.tl), 300);
}

/* ---------- feedback bar ---------- */
function feedbackBar(foot, ok, answerText, onNext, extra) {
  const fb = el(`
    <div class="feedback ${ok ? "good" : "bad"}">
      <div class="fb-head">
        <span class="fb-ico">${ok ? icon("check",{size:26}) : icon("cancel",{size:26})}</span>
        <div>
          <div class="fb-title">${ok ? "Tama! (Correct)" : "Almost!"}</div>
          ${ok ? (extra ? `<div class="fb-sub">${esc(extra)}</div>` : "") : `<div class="fb-sub">Answer: <b>${esc(answerText)}</b>${extra ? ` · ${esc(extra)}` : ""}</div>`}
        </div>
      </div>
      <button class="btn ${ok ? "btn-good" : "btn-bad"}" data-act="next">Continue</button>
    </div>`);
  foot.innerHTML = ""; foot.appendChild(fb);
  fb.querySelector('[data-act="next"]').onclick = onNext;
}

/* footnote glossing the helper words in a sentence exercise */
function notesHtml(ex) {
  if (!ex.notes || !ex.notes.length) return "";
  return `<div class="ex-notes"><span class="ex-notes-h">Helper words</span>${ex.notes.map((n) => `<span class="ex-note"><b>${esc(n.w)}</b> — ${esc(n.gloss)}</span>`).join("")}</div>`;
}

/* ---------- scored exercises ---------- */
function renderExercise(ex, body, foot, done, loseLife = () => {}) {
  const word = ex.word;
  const sayGuide = word?.say;
  const recapTag = ex.isRecap ? `<span class="recap-chip">${icon("reset",{size:14})} Recap</span>` : "";

  /* MULTIPLE CHOICE / LISTEN */
  if (ex.type === "choose" || ex.type === "listen") {
    const isListen = ex.type === "listen";
    body.innerHTML = `
      <div class="ex-prompt">${recapTag}${esc(ex.prompt)}</div>
      ${isListen
        ? `<button class="speaker-big" data-act="play">${icon("audio",{size:34})}<span>Tap to listen</span></button>`
        : `<div class="ex-question">${word?.emoji ? `<div class="ex-emoji">${word.emoji}</div>` : ""}
             <div class="ex-word">${esc(ex.question)}</div>
             ${ex.speakable ? `<button class="speaker-sm" data-act="play">${icon("audio",{size:18})}</button>` : ""}</div>`}
      <div class="options">${ex.options.map((o) => `<button class="option" data-val="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    const p = body.querySelector('[data-act="play"]');
    if (p) p.onclick = () => speak(ex.speakable);
    if (isListen) setTimeout(() => speak(ex.speakable), 350);
    let answered = false;
    body.querySelectorAll(".option").forEach((b) => {
      b.onclick = () => {
        if (answered) return; answered = true;
        const ok = checkAnswer(ex, b.dataset.val);
        noteWord(ex, ok);
        b.classList.add(ok ? "correct" : "wrong");
        if (!ok) { loseLife(); body.querySelectorAll(".option").forEach((x) => { if (checkAnswer(ex, x.dataset.val)) x.classList.add("correct"); }); }
        body.querySelectorAll(".option").forEach((x) => (x.disabled = true));
        feedbackBar(foot, ok, ex.answer, () => done(ok), sayGuide);
      };
    });
    return;
  }

  /* FILL IN THE BLANK (cloze) */
  if (ex.type === "cloze") {
    body.innerHTML = `
      <div class="ex-prompt">${icon("blank")} Fill in the blank</div>
      <div class="ex-question cloze-q">
        <div class="cloze-sentence">${esc(ex.display)}</div>
        <div class="cloze-en reveal hidden" id="clozeEn">${esc(ex.en)}</div>
      </div>
      ${notesHtml(ex)}
      <div class="options">${ex.options.map((o) => `<button class="option" data-val="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    let answered = false;
    body.querySelectorAll(".option").forEach((b) => {
      b.onclick = () => {
        if (answered) return; answered = true;
        const ok = checkAnswer(ex, b.dataset.val);
        noteWord(ex, ok);
        b.classList.add(ok ? "correct" : "wrong");
        if (!ok) { loseLife(); body.querySelectorAll(".option").forEach((x) => { if (checkAnswer(ex, x.dataset.val)) x.classList.add("correct"); }); }
        body.querySelectorAll(".option").forEach((x) => (x.disabled = true));
        body.querySelector("#clozeEn").classList.remove("hidden"); // reveal translation after answering
        speak(ex.answer);
        feedbackBar(foot, ok, ex.answer, () => done(ok));
      };
    });
    return;
  }

  /* BUILD A SENTENCE (tap word tiles in order) */
  if (ex.type === "build") {
    const chosen = [];
    body.innerHTML = `
      <div class="ex-prompt">${icon("build")} Tap the words in order</div>
      <div class="build-en">${esc(ex.en)}</div>
      ${notesHtml(ex)}
      <div class="build-answer" id="buildAns"></div>
      <div class="build-bank" id="buildBank">
        ${ex.tokens.map((t, idx) => `<button class="tile" data-idx="${idx}">${esc(t)}</button>`).join("")}</div>`;
    const ansEl = body.querySelector("#buildAns");
    const bank = body.querySelector("#buildBank");
    foot.innerHTML = `<button class="btn btn-primary" data-act="check" disabled>Check</button>`;
    const checkBtn = foot.querySelector('[data-act="check"]');
    function redraw() {
      ansEl.innerHTML = chosen.map((c, i) => `<button class="tile placed" data-pos="${i}">${esc(c.t)}</button>`).join("");
      bank.querySelectorAll(".tile").forEach((b) => { b.classList.toggle("used", chosen.some((c) => c.idx == b.dataset.idx)); b.disabled = chosen.some((c) => c.idx == b.dataset.idx); });
      checkBtn.disabled = chosen.length !== ex.tokens.length;
      ansEl.querySelectorAll(".tile").forEach((b) => { b.onclick = () => { chosen.splice(+b.dataset.pos, 1); redraw(); }; });
    }
    bank.querySelectorAll(".tile").forEach((b) => { b.onclick = () => { chosen.push({ idx: b.dataset.idx, t: b.textContent }); redraw(); }; });
    checkBtn.onclick = () => {
      const given = chosen.map((c) => c.t).join(" ");
      const ok = checkAnswer(ex, given);
      ansEl.querySelectorAll(".tile").forEach((t) => t.classList.add(ok ? "correct" : "wrong"));
      if (!ok) loseLife();
      speak(ex.answer);
      feedbackBar(foot, ok, ex.answer, () => done(ok));
    };
    return;
  }

  /* READING COMPREHENSION */
  if (ex.type === "reading") {
    body.innerHTML = `
      <div class="ex-prompt">${icon("reading")} Read & answer</div>
      <div class="reading-card">
        <div class="reading-passage">${ex.passage.split("\n").map((l) => `<div>${esc(l)}</div>`).join("")}</div>
        <button class="speaker-sm" data-act="play">${icon("audio",{size:18})} Listen</button>
        <div class="reading-en reveal hidden" id="readingEn"><span class="reveal-h">Translation</span>${esc(ex.en)}</div>
      </div>
      <div class="reading-q">${esc(ex.q)}</div>
      <div class="options">${ex.options.map((o) => `<button class="option" data-val="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    body.querySelector('[data-act="play"]').onclick = () => speak(ex.passage.replace(/\n/g, ". ").replace(/[A-Za-z]+:/g, ""));
    let answered = false;
    body.querySelectorAll(".option").forEach((b) => {
      b.onclick = () => {
        if (answered) return; answered = true;
        const ok = checkAnswer(ex, b.dataset.val);
        noteWord(ex, ok);
        b.classList.add(ok ? "correct" : "wrong");
        if (!ok) { loseLife(); body.querySelectorAll(".option").forEach((x) => { if (checkAnswer(ex, x.dataset.val)) x.classList.add("correct"); }); }
        body.querySelectorAll(".option").forEach((x) => (x.disabled = true));
        body.querySelector("#readingEn").classList.remove("hidden"); // reveal translation after answering
        feedbackBar(foot, ok, ex.answer, () => done(ok));
      };
    });
    return;
  }

  /* WRITE */
  if (ex.type === "write") {
    body.innerHTML = `
      <div class="ex-prompt">${esc(ex.prompt)}</div>
      <div class="ex-question">${word?.emoji ? `<div class="ex-emoji">${word.emoji}</div>` : ""}<div class="ex-word">${esc(ex.question)}</div></div>
      <input class="text-input" id="answerInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type in Tagalog…" />
      <div class="hint">Tip: accents and punctuation don't matter.</div>`;
    const input = body.querySelector("#answerInput");
    setTimeout(() => input.focus(), 50);
    foot.innerHTML = `<button class="btn btn-primary" data-act="check">Check</button>`;
    const submit = () => {
      const ok = checkAnswer(ex, input.value);
      noteWord(ex, ok);
      input.disabled = true; input.classList.add(ok ? "correct" : "wrong");
      if (!ok) loseLife();
      feedbackBar(foot, ok, ex.answer, () => done(ok), sayGuide);
    };
    foot.querySelector('[data-act="check"]').onclick = submit;
    input.onkeydown = (e) => { if (e.key === "Enter") submit(); };
    return;
  }

  /* SPEAK */
  if (ex.type === "speak") {
    const supported = canListen();
    body.innerHTML = `
      <div class="ex-prompt">${esc(ex.prompt)}</div>
      <div class="ex-question speak-q">
        <div class="ex-word big">${esc(ex.question)}</div>
        ${ex.hint ? `<div class="say-guide">${esc(ex.hint)}</div>` : ""}
        <button class="speaker-sm" data-act="play">${icon("audio",{size:18})} Hear it</button>
      </div>
      <div class="mic-wrap">
        <button class="mic-btn" data-act="mic" ${supported ? "" : "disabled"}>${icon("speaking",{size:40})}</button>
        <div class="mic-status" id="micStatus">${supported ? "Tap the mic and say it" : "Speech input isn't supported on this browser"}</div>
        <div class="heard" id="heard"></div>
      </div>`;
    body.querySelector('[data-act="play"]').onclick = () => speak(ex.speakable);
    const status = body.querySelector("#micStatus"), heard = body.querySelector("#heard");
    if (!supported) {
      foot.innerHTML = `<button class="btn btn-primary" data-act="ok">I said it ✓</button>`;
      foot.querySelector('[data-act="ok"]').onclick = () => done(true);
      return;
    }
    body.querySelector('[data-act="mic"]').onclick = async function () {
      heard.textContent = "";
      try {
        const transcript = await listen({
          onStart: () => { this.classList.add("listening"); status.textContent = "Listening… 🎙️"; },
          onEnd: () => this.classList.remove("listening")
        });
        if (!transcript) { status.textContent = "Didn't catch that — try again"; return; }
        heard.innerHTML = `You said: <b>${esc(transcript.split(" | ")[0])}</b>`;
        const ok = checkAnswer(ex, transcript);
        noteWord(ex, ok);
        status.textContent = ok ? "Great pronunciation!" : "Close — try again or continue";
        feedbackBar(foot, ok, ex.answer, () => done(ok));
      } catch (e) {
        status.textContent = "Mic unavailable — you can continue";
        foot.innerHTML = `<button class="btn btn-primary" data-act="skip">Continue</button>`;
        foot.querySelector('[data-act="skip"]').onclick = () => done(true);
      }
    };
    return;
  }

  /* MATCH PAIRS */
  if (ex.type === "match") {
    const pairs = ex.pairs;
    const left = shuffle(pairs.map((p) => ({ k: p.tl, match: p.en })));
    const right = shuffle(pairs.map((p) => ({ k: p.en, match: p.tl })));
    body.innerHTML = `
      <div class="ex-prompt">${icon("match")} Tap the matching pairs</div>
      <div class="match-grid">
        <div class="match-col">${left.map((x) => `<button class="match-item" data-side="L" data-key="${esc(x.k)}" data-match="${esc(x.match)}">${esc(x.k)}</button>`).join("")}</div>
        <div class="match-col">${right.map((x) => `<button class="match-item" data-side="R" data-key="${esc(x.k)}" data-match="${esc(x.match)}">${esc(x.k)}</button>`).join("")}</div>
      </div>`;
    let selected = null, matched = 0;
    body.querySelectorAll(".match-item").forEach((it) => {
      it.onclick = () => {
        if (it.classList.contains("matched")) return;
        if (!selected) { selected = it; it.classList.add("selected"); if (it.dataset.side === "L") speak(it.dataset.key); return; }
        if (selected === it) { it.classList.remove("selected"); selected = null; return; }
        const isMatch = selected.dataset.match === it.dataset.key && it.dataset.match === selected.dataset.key;
        if (isMatch) {
          [selected, it].forEach((x) => { x.classList.remove("selected"); x.classList.add("matched"); x.disabled = true; });
          // Matching only finishes when every pair is right, so it's always a win.
          if (++matched === pairs.length) feedbackBar(foot, true, "All matched!", () => done(true));
        } else {
          const a = selected, b = it;
          a.classList.add("badmatch"); b.classList.add("badmatch");
          setTimeout(() => { a.classList.remove("badmatch", "selected"); b.classList.remove("badmatch"); }, 600);
        }
        selected = null;
      };
    });
    return;
  }

  /* QUIZ */
  if (ex.type === "quiz") {
    const q = ex.quiz;
    if (q.type === "mc") {
      const opts = shuffle(q.options.slice());
      body.innerHTML = `
        <div class="ex-prompt">${icon("quiz")} Quiz</div>
        <div class="ex-question quiz-q"><div class="quiz-text">${esc(q.q)}</div></div>
        <div class="options">${opts.map((o) => `<button class="option" data-val="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
      let answered = false;
      body.querySelectorAll(".option").forEach((b) => {
        b.onclick = () => {
          if (answered) return; answered = true;
          const ok = checkAnswer({ type: "choose", answer: q.answer }, b.dataset.val);
          b.classList.add(ok ? "correct" : "wrong");
          if (!ok) { loseLife(); body.querySelectorAll(".option").forEach((x) => { if (checkAnswer({ type: "choose", answer: q.answer }, x.dataset.val)) x.classList.add("correct"); }); }
          body.querySelectorAll(".option").forEach((x) => (x.disabled = true));
          feedbackBar(foot, ok, q.answer, () => done(ok), q.explain);
        };
      });
    } else {
      body.innerHTML = `
        <div class="ex-prompt">${icon("quiz")} Quiz</div>
        <div class="ex-question quiz-q"><div class="quiz-text">${esc(q.q)}</div></div>
        <input class="text-input" id="quizInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer…" />
        <div class="hint">Tip: punctuation and capitals don't matter.</div>`;
      const input = body.querySelector("#quizInput");
      setTimeout(() => input.focus(), 50);
      foot.innerHTML = `<button class="btn btn-primary" data-act="check">Check</button>`;
      const submit = () => {
        const ok = checkAnswer({ type: "write", answer: q.answer }, input.value);
        input.disabled = true; input.classList.add(ok ? "correct" : "wrong");
        if (!ok) loseLife();
        feedbackBar(foot, ok, q.answer, () => done(ok), q.explain);
      };
      foot.querySelector('[data-act="check"]').onclick = submit;
      input.onkeydown = (e) => { if (e.key === "Enter") submit(); };
    }
    return;
  }
}

/* ---------- out of hearts / finish ---------- */
function outOfHearts(part) {
  app.innerHTML = `
    <div class="center-screen">
      <div class="big-emoji">💔</div><h2>Out of hearts</h2>
      <p>You ran out of hearts. Refill to keep going, or come back later — hearts recharge over time.</p>
      <div class="stack">
        <button class="btn btn-primary" data-act="refill">💎 Refill (50 gems)</button>
        <button class="btn btn-ghost" data-act="home">Back to lessons</button>
      </div>
    </div>`;
  app.querySelector('[data-act="refill"]').onclick = (e) => { if (store.buyHeartsWithGems()) startPart(part.id); else e.target.textContent = "Not enough gems 😅"; };
  app.querySelector('[data-act="home"]').onclick = () => go("home");
}

function finishPart(part, correct, total) {
  const title = part.partCount > 1 ? `${part.title} · ${part.part}` : part.title;
  const r = store.completeLesson({ lessonId: part.id, title, correct, total });
  const pct = total ? Math.round((correct / total) * 100) : 100;
  const achHtml = r.newAchievements.length
    ? `<div class="ach-pop"><div class="ach-pop-title">🎉 New achievement${r.newAchievements.length > 1 ? "s" : ""}!</div>
       ${r.newAchievements.map((a) => `<div class="ach-line">${a.icon} <b>${esc(a.title)}</b> — ${esc(a.desc)}</div>`).join("")}</div>` : "";
  app.innerHTML = `
    <div class="center-screen finish">
      <div class="confetti">🎊</div>
      <div class="stars-row">${[1, 2, 3].map((n) => `<span class="fstar ${n <= r.stars ? "on" : ""}">★</span>`).join("")}</div>
      <h2>Part complete!</h2>
      <div class="result-cards">
        <div class="rc"><div class="rc-ico">${icon("target", { size: 22 })}</div><div class="rc-val">${pct}%</div><div class="rc-lab">Accuracy</div></div>
        <div class="rc"><div class="rc-ico">${icon("level", { size: 22 })}</div><div class="rc-val">+${r.xpGain}</div><div class="rc-lab">XP</div></div>
        <div class="rc"><div class="rc-ico">${icon("gems", { size: 22 })}</div><div class="rc-val">+${r.gemGain}</div><div class="rc-lab">Gems</div></div>
      </div>
      ${achHtml}
      <div class="stack">
        <button class="btn btn-primary" data-act="continue">Continue</button>
        <button class="btn btn-ghost" data-act="again">Practice again</button>
      </div>
    </div>`;
  app.querySelector('[data-act="continue"]').onclick = () => go("home");
  app.querySelector('[data-act="again"]').onclick = () => startPart(part.id);
}

/* =====================================================================
 * UNIT TEST — final assessment for a whole unit (no hearts; 80% to pass)
 * ===================================================================== */
function startUnitTest(unitId) {
  const unit = unitById(unitId);
  if (!unit) return;
  const parts = PARTS.filter((p) => p.unitId === unitId);
  if (!parts.every((p) => store.isCompleted(p.id))) return; // still locked
  const known = parts[parts.length - 1].known || POOL; // everything learned through this unit
  runUnitTest(unit, unitTestSteps(unit, known));
}

function runUnitTest(unit, steps) {
  let i = 0, correct = 0;
  const total = steps.length;
  function paint() {
    if (i >= total) return finishUnitTest(unit, correct, total);
    const pct = Math.round((i / total) * 100);
    app.innerHTML = `
      <div class="lesson-shell">
        <div class="lesson-top">
          <button class="icon-btn" data-act="quit">✕</button>
          <div class="bar lesson-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="practice-tag">Unit Test · ${i + 1}/${total}</div>
        </div>
        <div class="lesson-body" id="exbody"></div>
        <div class="lesson-foot" id="exfoot"></div>
      </div>`;
    app.querySelector('[data-act="quit"]').onclick = () => { if (confirm("Quit the unit test? Your score won't be saved.")) go("home"); };
    renderExercise(steps[i], app.querySelector("#exbody"), app.querySelector("#exfoot"),
      (ok) => { if (ok) correct++; i++; paint(); }, () => {}); // no hearts in a test
  }
  paint();
}

function finishUnitTest(unit, correct, total) {
  const r = store.unitTestResult({ unitId: unit.id, title: `${unit.title} — Unit Test`, correct, total });
  const achHtml = r.newAchievements.length
    ? `<div class="ach-pop"><div class="ach-pop-title">🎉 New achievement${r.newAchievements.length > 1 ? "s" : ""}!</div>
       ${r.newAchievements.map((a) => `<div class="ach-line">${a.icon} <b>${esc(a.title)}</b> — ${esc(a.desc)}</div>`).join("")}</div>` : "";
  app.innerHTML = `
    <div class="center-screen finish">
      <div class="confetti">${r.passed ? "🏆" : "📝"}</div>
      ${r.passed ? `<div class="stars-row">${[1, 2, 3].map((n) => `<span class="fstar ${n <= r.stars ? "on" : ""}">★</span>`).join("")}</div>` : ""}
      <h2>${r.passed ? "Unit passed!" : "Almost there!"}</h2>
      <p class="muted">${esc(unit.title)}</p>
      <div class="result-cards">
        <div class="rc"><div class="rc-ico">${icon("target", { size: 22 })}</div><div class="rc-val">${r.pct}%</div><div class="rc-lab">Score</div></div>
        <div class="rc"><div class="rc-ico">${icon("level", { size: 22 })}</div><div class="rc-val">+${r.xpGain}</div><div class="rc-lab">XP</div></div>
        <div class="rc"><div class="rc-ico">${icon("gems", { size: 22 })}</div><div class="rc-val">+${r.gemGain}</div><div class="rc-lab">Gems</div></div>
      </div>
      <p class="muted small-text">${r.passed ? "You scored 80% or higher 🎉" : "You need 80% to pass — review your words and try again!"}</p>
      ${achHtml}
      <div class="stack">
        <button class="btn btn-primary" data-act="home">Back to lessons</button>
        <button class="btn btn-ghost" data-act="retry">${r.passed ? "Retake test" : "Try again"}</button>
      </div>
    </div>`;
  app.querySelector('[data-act="home"]').onclick = () => go("home");
  app.querySelector('[data-act="retry"]').onclick = () => startUnitTest(unit.id);
}

/* =====================================================================
 * DASHBOARD
 * ===================================================================== */
function renderDashboard() {
  const s = store.state;
  const total = PARTS.length, completed = store.completedCount();
  const overall = Math.round((completed / total) * 100);

  const days = [];
  for (let d = 6; d >= 0; d--) {
    const date = new Date(); date.setDate(date.getDate() - d);
    const key = date.toDateString();
    const xp = s.history.filter((h) => new Date(h.at).toDateString() === key).reduce((a, h) => a + h.xp, 0);
    days.push({ label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][date.getDay()], xp });
  }
  const maxXp = Math.max(30, ...days.map((d) => d.xp));

  const skill = { reading: 0, writing: 0, speaking: 0, listening: 0 };
  PARTS.forEach((p) => { if (store.isCompleted(p.id)) skill[p.skill] = (skill[p.skill] || 0) + 1; });

  const unitRows = COURSE.units.map((u) => {
    const parts = PARTS.filter((p) => p.unitId === u.id);
    const done = parts.filter((p) => store.isCompleted(p.id)).length;
    const pct = Math.round((done / parts.length) * 100);
    return `<div class="unit-row"><div class="ur-name">${icon(UNIT_ICON[u.id] || "reading", { size: 18 })} ${esc(u.title)}</div>
      <div class="bar small"><div class="bar-fill" style="width:${pct}%;background:${u.color}"></div></div>
      <div class="ur-pct">${done}/${parts.length}</div></div>`;
  }).join("");

  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">${icon("stats")} Your Progress</h1>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-ico s-level">${icon("level")}</div><div class="kpi-val">${s.xp}</div><div class="kpi-lab">Total XP</div></div>
        <div class="kpi"><div class="kpi-ico s-streak">${icon("streak")}</div><div class="kpi-val">${s.streak}</div><div class="kpi-lab">Day streak</div></div>
        <div class="kpi"><div class="kpi-ico">${icon("stats")}</div><div class="kpi-val">Lv ${store.level()}</div><div class="kpi-lab">Level</div></div>
        <div class="kpi"><div class="kpi-ico">${icon("check")}</div><div class="kpi-val">${completed}</div><div class="kpi-lab">Parts done</div></div>
      </div>
      <div class="card">
        <div class="card-title">Level ${store.level()} progress</div>
        <div class="bar"><div class="bar-fill" style="width:${Math.round(store.levelProgress() * 100)}%"></div></div>
        <div class="muted small-text">${100 - (s.xp % 100)} XP to level ${store.level() + 1}</div>
      </div>
      <div class="card">
        <div class="card-title">Last 7 days</div>
        <div class="chart">${days.map((d) => `<div class="chart-col"><div class="chart-bar" style="height:${Math.max(4, Math.round((d.xp / maxXp) * 100))}%" title="${d.xp} XP"></div><div class="chart-lab">${d.label}</div></div>`).join("")}</div>
      </div>
      <div class="card">
        <div class="card-title">Course completion — ${overall}%</div>
        <div class="bar"><div class="bar-fill" style="width:${overall}%"></div></div>
        <div class="unit-rows">${unitRows}</div>
      </div>
      <div class="card">
        <div class="card-title">Skills practiced</div>
        <div class="skill-grid">
          <div class="skill-cell">${icon("reading", { size: 26 })}<b>${skill.reading}</b><span>Reading</span></div>
          <div class="skill-cell">${icon("writing", { size: 26 })}<b>${skill.writing}</b><span>Writing</span></div>
          <div class="skill-cell">${icon("speaking", { size: 26 })}<b>${skill.speaking}</b><span>Speaking</span></div>
          <div class="skill-cell">${icon("listening", { size: 26 })}<b>${skill.listening}</b><span>Listening</span></div>
        </div>
      </div>
    </main>
    ${tabBar("dashboard")}`;
}

/* =====================================================================
 * REVIEW — a hub to review words & mistakes and to practise (no lesson repeats)
 * ===================================================================== */
function glossRow(w, missed) {
  const rec = RECORDED.has(audioSlug(w.tl));
  return `<button class="gloss-row" data-say="${esc(w.tl)}" data-search="${esc((w.tl + " " + w.en).toLowerCase())}">
    <div class="gloss-main">
      <div class="gloss-tl">${w.emoji ? `<span class="gloss-emoji">${w.emoji}</span>` : ""}${esc(w.tl)}${rec ? `<span class="rec-chip" title="Custom audio recorded">${icon("speaking", { size: 12 })} recorded</span>` : ""}</div>
      <div class="gloss-en">${esc(w.en)}${w.say ? ` · <i>${esc(w.say)}</i>` : ""}${missed ? ` · <span class="miss-tag">missed ${w.misses}×</span>` : ""}</div>
    </div>
    <span class="gloss-spk">${icon("audio", { size: 20 })}</span>
  </button>`;
}

function renderHistory() {
  const learned = learnedWords();
  const groups = learnedByUnit();
  const mistakes = store.mistakeList();

  const skill = { reading: 0, writing: 0, speaking: 0, listening: 0 };
  PARTS.forEach((p) => { if (store.isCompleted(p.id)) skill[p.skill] = (skill[p.skill] || 0) + 1; });

  const recent = store.state.history.slice(0, 10).map((h) => {
    const dt = new Date(h.at);
    return `<div class="recent-row"><span>${esc(h.title)}</span><span class="muted">+${h.xp} XP · ${dt.toLocaleDateString()}</span></div>`;
  }).join("") || `<div class="muted">No activity yet.</div>`;

  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">${icon("history")} Review</h1>

      <div class="card practice-hub">
        <div class="card-title">Practice hub</div>
        <p class="muted small-text">Quick, mixed practice from what you've learned — your lessons stay as they are.</p>
        <div class="review-actions">
          <button class="btn btn-primary" data-practice="words" ${learned.length ? "" : "disabled"}>
            ${icon("build", { size: 20 })} Practice your words${learned.length ? ` (${learned.length})` : ""}
          </button>
          <button class="btn ${mistakes.length ? "btn-bad" : "btn-ghost"}" data-practice="mistakes" ${mistakes.length ? "" : "disabled"}>
            ${icon("reset", { size: 20 })} Review mistakes${mistakes.length ? ` (${mistakes.length})` : ""}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Skills practised</div>
        <div class="skill-grid">
          <div class="skill-cell">${icon("reading", { size: 24 })}<b>${skill.reading}</b><span>Reading</span></div>
          <div class="skill-cell">${icon("writing", { size: 24 })}<b>${skill.writing}</b><span>Writing</span></div>
          <div class="skill-cell">${icon("speaking", { size: 24 })}<b>${skill.speaking}</b><span>Speaking</span></div>
          <div class="skill-cell">${icon("listening", { size: 24 })}<b>${skill.listening}</b><span>Listening</span></div>
        </div>
      </div>

      ${mistakes.length ? `
      <div class="card">
        <div class="card-title">Words to review (${mistakes.length})</div>
        <p class="muted small-text">Words you've missed. Tap to hear them, or practise them above.</p>
        <div class="gloss-list">${mistakes.map((w) => glossRow(w, true)).join("")}</div>
      </div>` : ""}

      <div class="card">
        <div class="card-title">Words you've learned (${learned.length})</div>
        ${learned.length ? `
          ${learned.length > 30 ? `<input class="search-box" id="glossSearch" type="search" placeholder="Search words…" autocomplete="off" />` : `<p class="muted small-text">Tap a word to hear it.</p>`}
          <div id="learnedList">
            ${groups.map((g) => `
              <div class="gloss-group">
                <div class="gloss-group-title">${esc(g.title)}</div>
                <div class="gloss-list">${g.words.map((w) => glossRow(w, false)).join("")}</div>
              </div>`).join("")}
          </div>
          <div class="muted small-text gloss-empty hidden" id="glossEmpty">No words match your search.</div>
        ` : `<div class="muted">Finish a lesson to start building your word list.</div>`}
      </div>

      <div class="card">
        <div class="card-title">Helper words</div>
        <p class="muted small-text">The little words (particles) that glue Tagalog sentences together.</p>
        <div class="help-list">${helperGlossary().map((g) => `<div class="help-row"><b>${esc(g.w)}</b><span>${esc(g.gloss)}</span></div>`).join("")}</div>
      </div>

      <div class="card"><div class="card-title">Recent activity</div><div class="recent-list">${recent}</div></div>
    </main>
    ${tabBar("history")}`;

  const search = app.querySelector("#glossSearch");
  if (search) {
    search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      app.querySelectorAll("#learnedList .gloss-row").forEach((r) => r.classList.toggle("hidden", !!q && !r.dataset.search.includes(q)));
      let anyVisible = false;
      app.querySelectorAll("#learnedList .gloss-group").forEach((g) => {
        const visible = [...g.querySelectorAll(".gloss-row")].some((r) => !r.classList.contains("hidden"));
        g.classList.toggle("hidden", !visible);
        if (visible) anyVisible = true;
      });
      app.querySelector("#glossEmpty").classList.toggle("hidden", anyVisible);
    };
  }
}

/* =====================================================================
 * PRACTICE player (Review hub) — fresh drill, no hearts, no lesson completion
 * ===================================================================== */
function startPractice(mode) {
  const words = mode === "mistakes" ? store.mistakeList() : learnedWords();
  if (!words.length) return;
  runPractice(mode, shuffle(words).slice(0, 10));
}

function runPractice(mode, words) {
  const steps = practiceSteps(words, learnedWords());
  const label = mode === "mistakes" ? "Mistake review" : "Word practice";
  let i = 0, correct = 0;
  const total = steps.length;

  function paint() {
    if (i >= total) return finishPractice(mode, label, correct, total);
    const pct = Math.round((i / total) * 100);
    app.innerHTML = `
      <div class="lesson-shell">
        <div class="lesson-top">
          <button class="icon-btn" data-act="quit">✕</button>
          <div class="bar lesson-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="practice-tag">${esc(label)}</div>
        </div>
        <div class="lesson-body" id="exbody"></div>
        <div class="lesson-foot" id="exfoot"></div>
      </div>`;
    app.querySelector('[data-act="quit"]').onclick = () => { if (confirm("Stop practising?")) go("history"); };
    renderExercise(steps[i], app.querySelector("#exbody"), app.querySelector("#exfoot"),
      (ok) => { if (ok) correct++; i++; paint(); }, () => {}); // no hearts in practice
  }
  paint();
}

function finishPractice(mode, label, correct, total) {
  const r = store.practiceResult({ correct, total, title: label });
  const pct = total ? Math.round((correct / total) * 100) : 100;
  const achHtml = r.newAchievements.length
    ? `<div class="ach-pop"><div class="ach-pop-title">🎉 New achievement${r.newAchievements.length > 1 ? "s" : ""}!</div>
       ${r.newAchievements.map((a) => `<div class="ach-line">${a.icon} <b>${esc(a.title)}</b> — ${esc(a.desc)}</div>`).join("")}</div>` : "";
  const left = store.mistakeList().length;
  app.innerHTML = `
    <div class="center-screen finish">
      <div class="confetti">🎊</div>
      <h2>Nice practice!</h2>
      <div class="result-cards">
        <div class="rc"><div class="rc-ico">${icon("target", { size: 22 })}</div><div class="rc-val">${pct}%</div><div class="rc-lab">Accuracy</div></div>
        <div class="rc"><div class="rc-ico">${icon("level", { size: 22 })}</div><div class="rc-val">+${r.xpGain}</div><div class="rc-lab">XP</div></div>
        <div class="rc"><div class="rc-ico">${icon("gems", { size: 22 })}</div><div class="rc-val">+${r.gemGain}</div><div class="rc-lab">Gems</div></div>
      </div>
      ${mode === "mistakes" ? `<p class="muted">${left ? `${left} word${left > 1 ? "s" : ""} still to review` : "You cleared all your review words! 🎉"}</p>` : ""}
      ${achHtml}
      <div class="stack">
        <button class="btn btn-primary" data-act="back">Back to Review</button>
        ${(mode === "mistakes" ? left : learnedWords().length) ? `<button class="btn btn-ghost" data-act="again">Practise again</button>` : ""}
      </div>
    </div>`;
  app.querySelector('[data-act="back"]').onclick = () => go("history");
  const again = app.querySelector('[data-act="again"]');
  if (again) again.onclick = () => startPractice(mode);
}

/* =====================================================================
 * REWARDS
 * ===================================================================== */
function renderRewards() {
  const s = store.state;
  const achHtml = ACHIEVEMENTS.map((a) => {
    const got = store.hasAchievement(a.id);
    return `<div class="badge ${got ? "earned" : "locked"}"><div class="badge-ico">${got ? a.icon : icon("lock", { size: 30 })}</div>
      <div class="badge-title">${esc(a.title)}</div><div class="badge-desc">${esc(a.desc)}</div></div>`;
  }).join("");
  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">${icon("rewards")} Rewards</h1>
      <div class="card shop-card">
        <div class="card-title gem-title">${icon("gems", { size: 20 })} ${s.gems} gems</div>
        <p class="muted small-text">Earn gems by finishing parts. Better scores earn more.</p>
        <button class="btn btn-primary" data-act="buyhearts">${icon("hearts", { size: 20 })} Refill hearts — 50 ${icon("gems", { size: 18 })}</button>
      </div>
      <div class="card"><div class="card-title">Achievements — ${s.achievements.length}/${ACHIEVEMENTS.length}</div>
        <div class="badges-grid">${achHtml}</div></div>
    </main>
    ${tabBar("rewards")}`;
  app.querySelector('[data-act="buyhearts"]').onclick = (e) => {
    if (store.buyHeartsWithGems()) { e.target.textContent = "Hearts refilled! ❤️"; setTimeout(render, 700); }
    else e.target.textContent = store.hearts >= 5 ? "Hearts already full ❤️" : "Not enough gems 😅";
  };
}

/* =====================================================================
 * PROFILE
 * ===================================================================== */
function renderProfile() {
  const s = store.state;
  const joined = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "today";
  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">${icon("profile")} Profile</h1>
      <div class="card profile-head"><div class="avatar">🐃</div>
        <div><div class="profile-name">Tagalog Learner</div><div class="muted small-text">Learning Tagalog · Joined ${joined}</div></div></div>
      <div class="card"><div class="card-title">Summary</div>
        <div class="summary-grid">
          <div><b>${s.xp}</b><span>XP</span></div><div><b>${store.level()}</b><span>Level</span></div>
          <div><b>${s.bestStreak}</b><span>Best streak</span></div><div><b>${store.completedCount()}</b><span>Parts</span></div>
          <div><b>${s.achievements.length}</b><span>Badges</span></div><div><b>${s.gems}</b><span>Gems</span></div>
        </div></div>
      <div class="card"><div class="card-title">Settings</div>
        <label class="setting-row"><span>${icon("audio",{size:18})} Speech speed</span><input type="range" min="0.5" max="1.2" step="0.05" value="${s.settings.ttsRate}" id="rate"></label>
        <button class="btn btn-ghost" data-act="testvoice">Test voice 🔉</button>
        <div class="muted small-text">${canSpeak() ? "Speech playback available" : "⚠️ No speech voices in this browser"} · ${canListen() ? "Microphone input available" : "⚠️ No speech recognition in this browser"}</div></div>
      <div class="card danger"><div class="card-title">Reset</div>
        <p class="muted small-text">Erase all progress, XP, streaks and achievements. This can't be undone.</p>
        <button class="btn btn-danger" data-act="reset">Reset all progress</button></div>
      <div class="footer-note">Tara! — Learn Tagalog · works offline · v1.2</div>
    </main>
    ${tabBar("profile")}`;
  const rate = app.querySelector("#rate");
  rate.oninput = () => { store.state.settings.ttsRate = parseFloat(rate.value); store.save(); };
  app.querySelector('[data-act="testvoice"]').onclick = () => speak("Kumusta! Magandang araw sa iyo.");
  app.querySelector('[data-act="reset"]').onclick = () => { if (confirm("Reset ALL progress? This cannot be undone.")) { store.reset(); go("home"); } };
}

/* =====================================================================
 * HEARTS
 * ===================================================================== */
function renderHearts() {
  const mins = Math.ceil(store.msUntilNextHeart() / 60000);
  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">${icon("hearts")} Hearts</h1>
      <div class="card center-card">
        <div class="big-hearts">${`<span class="hfull">${icon("hearts", { size: 40 })}</span>`.repeat(store.hearts)}${`<span class="hempty">${icon("hearts", { size: 40 })}</span>`.repeat(5 - store.hearts)}</div>
        <p>You have <b>${store.hearts}</b> of 5 hearts.</p>
        <p class="muted small-text">${store.hearts >= 5 ? "Hearts are full!" : `Next heart in about ${mins} min. Hearts also refill as you take lessons.`}</p>
        <button class="btn btn-primary" data-act="buy">Refill now — 50 💎</button>
        <button class="btn btn-ghost" data-act="back">Back</button>
      </div>
    </main>
    ${tabBar("home")}`;
  app.querySelector('[data-act="buy"]').onclick = (e) => { if (store.buyHeartsWithGems()) go("home"); else e.target.textContent = "Not enough gems 😅"; };
  app.querySelector('[data-act="back"]').onclick = () => go("home");
}

/* =====================================================================
 * Router + events + boot
 * ===================================================================== */
function render() {
  ({ home: renderHome, dashboard: renderDashboard, history: renderHistory, rewards: renderRewards, profile: renderProfile, hearts: renderHearts }[state.route] || renderHome)();
}

app.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-route]"); if (tab) return go(tab.dataset.route);
  const part = e.target.closest("[data-part]"); if (part && !part.disabled) return startPart(part.dataset.part);
  const utest = e.target.closest("[data-unittest]"); if (utest && !utest.disabled) return startUnitTest(utest.dataset.unittest);
  const practice = e.target.closest("[data-practice]"); if (practice && !practice.disabled) return startPractice(practice.dataset.practice);
  const say = e.target.closest("[data-say]"); if (say) return speak(say.dataset.say);
  const hearts = e.target.closest('[data-act="hearts"]'); if (hearts) return go("hearts");
});

render();
loadRecorded();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
