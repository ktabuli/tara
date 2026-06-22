/* =====================================================================
 * app.js — Tara! Learn Tagalog  (main application)
 * ---------------------------------------------------------------------
 * Mobile-first PWA. Renders all screens and runs the interleaved,
 * bite-sized lesson player (flashcards mixed with games).
 * ===================================================================== */

import { COURSE, allLessons, unitById } from "./curriculum.js";
import { store, ACHIEVEMENTS } from "./store.js";
import {
  allParts, partById, buildSteps, practiceSteps, unitTestSteps, checkpointSteps, checkAnswer,
  speak, listen, canListen, canSpeak, shuffle, audioSlug, helperGlossary
} from "./lessons.js";
import { icon } from "./icons.js";

const app = document.getElementById("app");
const POOL = allLessons().flatMap((l) => l.vocab);   // distractor pool
const PARTS = allParts();
const state = { route: "home" };
let homeTimer = null; // live countdown ticker for node cooldowns on the Learn page

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
function go(route) { if (homeTimer) { clearInterval(homeTimer); homeTimer = null; } state.route = route; render(); window.scrollTo({ top: 0 }); }

/* readable foreground (charcoal or white) for a given background colour */
function fg(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#2A2C24" : "#FEFDFF";
}

/* unit-test ranking medal by best score */
function medalFor(pct) { return pct >= 95 ? "🥇" : pct >= 80 ? "🥈" : pct >= 60 ? "🥉" : ""; }
/* m:ss countdown from milliseconds */
function fmtCountdown(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
/* Ordered chain of everything that must be done in sequence: lesson parts,
 * a required halfway checkpoint inside each unit, a required unit test at the
 * unit's end, and a required cumulative checkpoint after every 2nd unit. Each
 * item unlocks when the previous is done. */
const GATES = (() => {
  const g = [];
  COURSE.units.forEach((u, ui) => {
    const up = PARTS.filter((p) => p.unitId === u.id);
    const half = Math.ceil(up.length / 2);
    up.slice(0, half).forEach((p) => g.push({ kind: "part", id: p.id }));
    g.push({ kind: "halfway", id: "hw" + u.id, unitIndex: ui });
    up.slice(half).forEach((p) => g.push({ kind: "part", id: p.id }));
    g.push({ kind: "unittest", id: "ut" + u.id, unitId: u.id });
    if ((ui + 1) % 2 === 0) g.push({ kind: "cumulative", id: "cp" + ui, unitIndex: ui });
  });
  return g;
})();
function gateDone(gt) {
  if (gt.kind === "part") return store.isCompleted(gt.id);
  if (gt.kind === "unittest") return store.unitTestTaken(gt.unitId); // any score clears it
  return store.checkpointDone(gt.id); // halfway / cumulative — needs >= 30%
}
function isUnlocked(id) {
  const i = GATES.findIndex((g) => g.id === id);
  return i === 0 || (i > 0 && gateDone(GATES[i - 1]));
}

/* =====================================================================
 * Top stats bar + bottom tab bar
 * ===================================================================== */
function statsBar() {
  const s = store.state;
  return `
    <header class="topbar">
      <div class="stat s-streak" title="Day streak"><span class="stat-ico">${icon("streak", { size: 20 })}</span><span class="stat-val">${s.streak}</span></div>
      <div class="stat s-gems" title="Gems"><span class="stat-ico">${icon("gems", { size: 20 })}</span><span class="stat-val">${store.gems}</span></div>
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
    const half = Math.ceil(parts.length / 2);
    // path items in order: first-half parts → halfway checkpoint → second-half parts
    const items = [
      ...parts.slice(0, half).map((p) => ({ kind: "part", p })),
      { kind: "halfway" },
      ...parts.slice(half).map((p) => ({ kind: "part", p }))
    ];
    const nodes = items.map((it, li) => {
      const offset = li % 2;
      if (it.kind === "halfway") {
        const hwId = "hw" + unit.id;
        const done = store.checkpointDone(hwId);
        const unlocked = isUnlocked(hwId);
        return `
          <button class="node checkpoint-node ${done ? "done" : unlocked ? "ready" : "locked"}"
                  data-halfway="${unit.id}" ${unlocked ? "" : "disabled"}>
            <span class="node-circle big">${done ? icon("check", { size: 40 }) : unlocked ? icon("reset", { size: 34 }) : icon("lock", { size: 30 })}</span>
            <span class="node-title">Checkpoint</span>
          </button>`;
      }
      const p = it.p;
      const done = store.isCompleted(p.id);
      const stars = store.lessonStars(p.id);
      const unlocked = isUnlocked(p.id);
      const cdMs = store.cooldownRemaining(p.id);
      const cooling = unlocked && !done && cdMs > 0; // failed recently — locked behind a timer
      const label = p.partCount > 1 ? `${p.title} · ${p.part}` : p.title;
      const cls = cooling ? "cooldown" : done ? "done" : unlocked ? "ready" : "locked";
      const circle = cooling ? icon("history", { size: 30 })
        : done ? icon("check", { size: 34 })
        : unlocked ? (SKILL_ICON[p.skill] || icon("reading"))
        : icon("lock", { size: 28 });
      return `
        <button class="node ${cls} pos-${offset}"
                data-part="${p.id}" ${unlocked ? "" : "disabled"}
                ${cooling ? `data-cooldown-until="${Date.now() + cdMs}"` : ""}
                style="--unit-color:${unit.color}">
          <span class="node-circle" style="${unlocked && !done && !cooling ? `color:${fg(unit.color)}` : ""}">${circle}</span>
          <span class="node-stars">${"★".repeat(stars)}${"☆".repeat(done ? 3 - stars : 0)}</span>
          <span class="node-title">${cooling ? `Retry in ${fmtCountdown(cdMs)}` : esc(label)}</span>
        </button>`;
    }).join("");

    // Unit test — REQUIRED to advance, but any score clears the gate. Shows a
    // best-score ranking medal to motivate (optional) retakes for 100%.
    const utUnlocked = isUnlocked("ut" + unit.id);
    const taken = store.unitTestTaken(unit.id);
    const best = store.unitTestBest(unit.id);
    const medal = taken ? medalFor(best) : "";
    const utCls = !utUnlocked ? "locked" : taken ? "passed" : "ready";
    const utSub = !utUnlocked ? "Finish the lessons to unlock"
      : taken ? `Best ${best}%${medal ? ` ${medal}` : ""} — tap to retake`
      : "Required · test everything in this unit";
    const utIco = !utUnlocked ? icon("lock", { size: 22 })
      : taken ? (medal ? `<span class="ut-medal">${medal}</span>` : icon("check", { size: 24 }))
      : icon("rewards", { size: 24 });
    const utHtml = `
      <button class="unit-test ${utCls}" data-unittest="${unit.id}" ${utUnlocked ? "" : "disabled"}>
        <span class="ut-ico">${utIco}</span>
        <span class="ut-main"><span class="ut-title">Unit Test</span><span class="ut-sub">${utSub}</span></span>
      </button>`;

    // Checkpoint — cumulative mixed review after every 2nd unit (≈ every 4 lessons)
    const cpHtml = (ui + 1) % 2 === 0 ? checkpointNode(ui) : "";

    return `
      <section class="unit">
        <div class="unit-banner" style="background:${unit.color};color:${fg(unit.color)}">
          <div><div class="unit-kicker">UNIT ${ui + 1} · ${esc(unit.subtitle)}</div>
          <div class="unit-name">${icon(UNIT_ICON[unit.id] || "reading", { size: 24 })} ${esc(unit.title)}</div></div>
        </div>
        <div class="path">${nodes}</div>
        ${utHtml}
      </section>
      ${cpHtml}`;
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

  scheduleHomeCooldownTick();
}

/* Tick down any node-cooldown timers shown on the Learn page; re-render the
 * page once a cooldown expires so the node returns to its normal state. */
function scheduleHomeCooldownTick() {
  if (homeTimer) { clearInterval(homeTimer); homeTimer = null; }
  if (!app.querySelector("[data-cooldown-until]")) return;
  homeTimer = setInterval(() => {
    if (state.route !== "home") { clearInterval(homeTimer); homeTimer = null; return; }
    let expired = false;
    app.querySelectorAll("[data-cooldown-until]").forEach((node) => {
      const ms = Number(node.dataset.cooldownUntil) - Date.now();
      if (ms <= 0) { expired = true; return; }
      const t = node.querySelector(".node-title");
      if (t) t.textContent = `Retry in ${fmtCountdown(ms)}`;
    });
    if (expired) renderHome();
  }, 1000);
}

/* =====================================================================
 * LESSON PLAYER — interleaved steps (teaching + games)
 * ===================================================================== */
const NODE_HEARTS = 3; // hearts per node (fresh every attempt)

function startPart(partId) {
  const cd = store.cooldownRemaining(partId);
  if (cd > 0) return cooldownPrompt(partById(partId), cd); // failed recently — offer to wait or pay
  const part = partById(partId);
  if (!part) return go("home");
  runPart(part, buildSteps(part, POOL));
}

/* small ❤ row for the lesson header: filled then empty up to NODE_HEARTS */
function heartsMiniHtml(hearts) {
  let out = "";
  for (let k = 0; k < NODE_HEARTS; k++) out += `<span class="hm ${k < hearts ? "full" : "empty"}">${icon("hearts", { size: 18 })}</span>`;
  return out;
}

function runPart(part, steps) {
  let i = 0, correct = 0, hearts = NODE_HEARTS, skipUsed = false;
  const scored = steps.filter((s) => s.type !== "teach" && s.type !== "tip").length;

  function shell() {
    const pct = Math.round((i / steps.length) * 100);
    app.innerHTML = `
      <div class="lesson-shell">
        <div class="lesson-top">
          <button class="icon-btn" data-act="quit">✕</button>
          <div class="bar lesson-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="hearts-mini" id="heartsMini">${heartsMiniHtml(hearts)}</div>
        </div>
        <div class="lesson-body" id="exbody"></div>
        <div class="lesson-skip" id="exskip"></div>
        <div class="lesson-foot" id="exfoot"></div>
      </div>`;
    app.querySelector('[data-act="quit"]').onclick = () => { if (confirm("Quit this lesson? Progress in it won't be saved.")) go("home"); };
    return { body: app.querySelector("#exbody"), foot: app.querySelector("#exfoot"), skip: app.querySelector("#exskip") };
  }

  function loseLife() {
    if (hearts > 0) hearts--;
    const hm = app.querySelector("#heartsMini");
    if (hm) { hm.innerHTML = heartsMiniHtml(hearts); hm.classList.remove("lost"); void hm.offsetWidth; hm.classList.add("lost"); }
  }

  function next(wasCorrect) {
    if (wasCorrect) correct++;
    if (hearts <= 0) return outOfHeartsPopup();
    i++; paint();
  }

  // 3 mistakes → out of hearts: pay to refill & resume in place, or end (fail + cooldown)
  function outOfHeartsPopup() {
    const cost = store.rescueCost();
    const canPay = store.gems >= cost;
    const ov = modal({
      emoji: "💔",
      title: "Out of hearts",
      msg: `You've used all ${NODE_HEARTS} hearts for this lesson.`,
      note: canPay ? "" : `You need ${cost} gems to continue. Earn gems by finishing lessons.`,
      buttons: [
        { label: `${icon("gems", { size: 18 })} Use ${cost} gems — refill & continue`, cls: "btn-primary", disabled: !canPay,
          onClick: () => { if (store.spendGems(cost)) { ov.remove(); hearts = NODE_HEARTS; i++; paint(); } } },
        { label: "End lesson", cls: "btn-ghost",
          onClick: () => { ov.remove(); store.setCooldown(part.id); go("home"); } }
      ]
    });
  }

  function paint() {
    if (i >= steps.length) return finishPart(part, correct, scored);
    const step = steps[i];
    const { body, foot, skip } = shell();
    if (step.type === "tip") return renderTip(step.tip, body, foot, () => { i++; paint(); });
    if (step.type === "teach") return renderTeach(step.word, body, foot, () => { i++; paint(); });
    renderExercise(step, body, foot, next, loseLife);
    // one skip per node; match can't be failed so it's never skippable
    if (!skipUsed && step.type !== "match") renderSkip(skip, step, body, foot, () => { skipUsed = true; next(false); });
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
function feedbackBar(foot, ok, answerText, onNext, extra, skipped = false) {
  // a skip control may be showing alongside the exercise — clear it
  const sk = document.getElementById("exskip"); if (sk) sk.innerHTML = "";
  const showAnswer = skipped || !ok;
  const cls = skipped ? "skip" : ok ? "good" : "bad";
  const ico = skipped ? icon("skip", { size: 26 }) : ok ? icon("check", { size: 26 }) : icon("cancel", { size: 26 });
  const title = skipped ? "Skipped — here's the answer" : ok ? "Tama! (Correct)" : "Almost!";
  const fb = el(`
    <div class="feedback ${cls}">
      <div class="fb-head">
        <span class="fb-ico">${ico}</span>
        <div>
          <div class="fb-title">${title}</div>
          ${showAnswer ? `<div class="fb-sub">Answer: <b>${esc(answerText)}</b>${extra ? ` · ${esc(extra)}` : ""}</div>` : (extra ? `<div class="fb-sub">${esc(extra)}</div>` : "")}
        </div>
      </div>
      <button class="btn ${skipped ? "btn-skip" : ok ? "btn-good" : "btn-bad"}" data-act="next">Continue</button>
    </div>`);
  foot.innerHTML = ""; foot.appendChild(fb);
  fb.querySelector('[data-act="next"]').onclick = onNext;
}

/* "I don't know" control — one skip per node. Reveals the answer (no heart
 * lost), logs the word for Review, and moves on. Only rendered while the
 * node's single skip is still available. */
function renderSkip(slot, ex, body, foot, onSkip) {
  if (!slot) return;
  slot.innerHTML = `<button class="skip-btn" data-act="skip">${icon("skip", { size: 16 })} I don't know</button>`;
  const answer = ex.type === "quiz" ? ex.quiz.answer : ex.answer;
  const extra = ex.type === "quiz" ? ex.quiz.explain : null;
  const isCorrect = (val) => checkAnswer(ex.type === "quiz" ? { type: "choose", answer } : ex, val);
  slot.querySelector('[data-act="skip"]').onclick = () => {
    if (ex.word) store.recordMistake(ex.word); // resurface it in Review
    body.querySelectorAll(".option, .tile, .match-item, .mic-btn").forEach((x) => (x.disabled = true));
    body.querySelectorAll(".text-input").forEach((x) => { x.disabled = true; });
    body.querySelectorAll(".option").forEach((x) => { if (isCorrect(x.dataset.val)) x.classList.add("correct"); });
    const ce = body.querySelector("#clozeEn"); if (ce) ce.classList.remove("hidden");
    const re = body.querySelector("#readingEn"); if (re) re.classList.remove("hidden");
    if (answer) speak(answer);
    feedbackBar(foot, false, answer, onSkip, extra, true);
  };
}

/* ---------- overlay modal (out-of-hearts, cooldown prompts) ---------- */
function modal({ emoji, title, msg, note, buttons }) {
  const ov = el(`
    <div class="modal-ov">
      <div class="modal-card">
        ${emoji ? `<div class="modal-emoji">${emoji}</div>` : ""}
        <div class="modal-title">${esc(title)}</div>
        ${msg ? `<div class="modal-msg">${esc(msg)}</div>` : ""}
        ${note ? `<div class="modal-note">${esc(note)}</div>` : ""}
        <div class="modal-actions"></div>
      </div>
    </div>`);
  const acts = ov.querySelector(".modal-actions");
  buttons.forEach((b) => {
    const btn = el(`<button class="btn ${b.cls || "btn-primary"}" ${b.disabled ? "disabled" : ""}>${b.label}</button>`);
    if (!b.disabled && b.onClick) btn.onclick = b.onClick;
    acts.appendChild(btn);
  });
  app.appendChild(ov);
  return ov;
}

/* Tapping a node that's still in its retry cooldown: wait, or pay to skip it. */
function cooldownPrompt(part, cdMs) {
  if (!part) return;
  const cost = store.rescueCost();
  const canPay = store.gems >= cost;
  const ov = modal({
    emoji: "⏳",
    title: "Locked — retry cooldown",
    msg: `You can retake this lesson in ${fmtCountdown(cdMs)}.`,
    note: canPay ? "" : `Or earn ${cost} gems to skip the wait.`,
    buttons: [
      { label: `${icon("gems", { size: 18 })} Pay ${cost} gems — skip the wait`, cls: "btn-primary", disabled: !canPay,
        onClick: () => { if (store.spendGems(cost)) { store.clearCooldown(part.id); ov.remove(); startPart(part.id); } } },
      { label: "Wait", cls: "btn-ghost", onClick: () => { ov.remove(); } }
    ]
  });
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
      ${notesHtml(ex)}
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

/* ---------- finish ---------- */
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
 * UNIT TEST — required, heart-free, no skips. Any score clears the gate; the
 * score is shown as a ranking to motivate voluntary retakes for 100%.
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
  const best = store.unitTestBest(unit.id);
  const medal = medalFor(best);
  const achHtml = r.newAchievements.length
    ? `<div class="ach-pop"><div class="ach-pop-title">🎉 New achievement${r.newAchievements.length > 1 ? "s" : ""}!</div>
       ${r.newAchievements.map((a) => `<div class="ach-line">${a.icon} <b>${esc(a.title)}</b> — ${esc(a.desc)}</div>`).join("")}</div>` : "";
  // Always pass-through (required gate already cleared). Show a ranking to
  // motivate voluntary retakes for 100%.
  const rankLine = r.pct >= 100 ? "Perfect score! 🥇 You aced the unit."
    : `Best so far: ${best}%${medal ? ` ${medal}` : ""} — retake any time to reach 100%.`;
  app.innerHTML = `
    <div class="center-screen finish">
      <div class="confetti">${medal || "🎯"}</div>
      <div class="stars-row">${[1, 2, 3].map((n) => `<span class="fstar ${n <= r.stars ? "on" : ""}">★</span>`).join("")}</div>
      <h2>Unit complete!</h2>
      <p class="muted">${esc(unit.title)}</p>
      <div class="result-cards">
        <div class="rc"><div class="rc-ico">${icon("target", { size: 22 })}</div><div class="rc-val">${r.pct}%</div><div class="rc-lab">Score</div></div>
        <div class="rc"><div class="rc-ico">${icon("level", { size: 22 })}</div><div class="rc-val">+${r.xpGain}</div><div class="rc-lab">XP</div></div>
        <div class="rc"><div class="rc-ico">${icon("gems", { size: 22 })}</div><div class="rc-val">+${r.gemGain}</div><div class="rc-lab">Gems</div></div>
      </div>
      <p class="muted small-text">${rankLine}</p>
      ${achHtml}
      <div class="stack">
        <button class="btn btn-primary" data-act="home">Continue</button>
        <button class="btn btn-ghost" data-act="retry">Retake for a better score</button>
      </div>
    </div>`;
  app.querySelector('[data-act="home"]').onclick = () => go("home");
  app.querySelector('[data-act="retry"]').onclick = () => startUnitTest(unit.id);
}

/* =====================================================================
 * CHECKPOINTS — required reviews (no hearts)
 *   • halfway: inside each unit (gates the unit's second half)
 *   • cumulative: after every 2nd unit (gates the next unit)
 * ===================================================================== */
function checkpointPartsThrough(ui) {
  const upto = COURSE.units.slice(0, ui + 1).map((u) => u.id);
  return PARTS.filter((p) => upto.includes(p.unitId));
}

/* the cumulative-checkpoint banner shown after a unit */
function checkpointNode(ui) {
  const id = "cp" + ui;
  const num = Math.ceil((ui + 1) / 2);
  const unlocked = isUnlocked(id);
  const done = store.checkpointDone(id);
  const best = store.checkpointBest(id);
  const tried = !done && best > 0; // attempted but scored < 30%
  const cls = !unlocked ? "locked" : done ? "done" : "ready";
  const sub = !unlocked ? "Finish the lessons above to unlock"
    : done ? `Done${best ? ` · best ${best}%` : ""} — review again`
    : tried ? `Scored ${best}% — need 30% to pass`
    : "Required · score 30% on a mixed review to continue";
  return `
    <button class="checkpoint ${cls}" data-checkpoint="${ui}" ${unlocked ? "" : "disabled"}>
      <span class="cp-ico">${!unlocked ? icon("lock", { size: 22 }) : icon("reset", { size: 24 })}</span>
      <span class="ut-main"><span class="ut-title">Checkpoint ${num}</span><span class="ut-sub">${esc(sub)}</span></span>
    </button>`;
}

/* cumulative checkpoint after unit index `ui` */
function startCheckpoint(ui) {
  const id = "cp" + ui;
  if (!isUnlocked(id)) return;
  const parts = checkpointPartsThrough(ui);
  const known = parts[parts.length - 1].known || POOL;
  const sentences = COURSE.units.slice(0, ui + 1).flatMap((u) => u.lessons.flatMap((l) => l.sentences || []));
  const num = Math.ceil((ui + 1) / 2);
  runReview(id, `Checkpoint ${num}`, checkpointSteps(known, sentences), () => startCheckpoint(ui));
}

/* halfway checkpoint inside a unit */
function startHalfway(unitId) {
  const hwId = "hw" + unitId;
  if (!isUnlocked(hwId)) return;
  const unit = unitById(unitId);
  const parts = PARTS.filter((p) => p.unitId === unitId);
  const half = Math.ceil(parts.length / 2);
  const known = parts[half - 1].known || POOL;             // everything learned up to the midpoint
  const focus = parts.slice(0, half).flatMap((p) => p.words); // this unit's first-half words
  const sentences = unit.lessons.flatMap((l) => l.sentences || []);
  runReview(hwId, `${unit.title} — Checkpoint`, checkpointSteps(known, sentences, { vocab: 8, matches: 2, focus }), () => startHalfway(unitId));
}

/* shared player + results for any checkpoint review */
function runReview(id, label, steps, restart) {
  let i = 0, correct = 0;
  const total = steps.length;
  function paint() {
    if (i >= total) return finishReview(id, label, correct, total, restart);
    const pct = Math.round((i / total) * 100);
    app.innerHTML = `
      <div class="lesson-shell">
        <div class="lesson-top">
          <button class="icon-btn" data-act="quit">✕</button>
          <div class="bar lesson-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="practice-tag">${esc(label)} · ${i + 1}/${total}</div>
        </div>
        <div class="lesson-body" id="exbody"></div>
        <div class="lesson-foot" id="exfoot"></div>
      </div>`;
    app.querySelector('[data-act="quit"]').onclick = () => { if (confirm("Quit the checkpoint? Your progress in it won't be saved.")) go("home"); };
    renderExercise(steps[i], app.querySelector("#exbody"), app.querySelector("#exfoot"),
      (ok) => { if (ok) correct++; i++; paint(); }, () => {});
  }
  paint();
}

function finishReview(id, label, correct, total, restart) {
  const r = store.checkpointResult({ id, title: label, correct, total });
  const passed = r.pct >= 30; // checkpoints gate at 30%
  const achHtml = r.newAchievements.length
    ? `<div class="ach-pop"><div class="ach-pop-title">🎉 New achievement${r.newAchievements.length > 1 ? "s" : ""}!</div>
       ${r.newAchievements.map((a) => `<div class="ach-line">${a.icon} <b>${esc(a.title)}</b> — ${esc(a.desc)}</div>`).join("")}</div>` : "";
  app.innerHTML = `
    <div class="center-screen finish">
      <div class="confetti">${passed ? "🧠" : "📝"}</div>
      <h2>${passed ? "Memory refreshed!" : "Almost there!"}</h2>
      <p class="muted">${esc(label)}</p>
      <div class="result-cards">
        <div class="rc"><div class="rc-ico">${icon("target", { size: 22 })}</div><div class="rc-val">${r.pct}%</div><div class="rc-lab">Score</div></div>
        <div class="rc"><div class="rc-ico">${icon("level", { size: 22 })}</div><div class="rc-val">+${r.xpGain}</div><div class="rc-lab">XP</div></div>
        <div class="rc"><div class="rc-ico">${icon("gems", { size: 22 })}</div><div class="rc-val">+${r.gemGain}</div><div class="rc-lab">Gems</div></div>
      </div>
      <p class="muted small-text">${passed ? "You cleared the checkpoint 🎉" : "You need 30% to pass — review your words and try again."}</p>
      ${achHtml}
      <div class="stack">
        <button class="btn btn-primary" data-act="home">Continue</button>
        <button class="btn btn-ghost" data-act="again">${passed ? "Review again" : "Try again"}</button>
      </div>
    </div>`;
  app.querySelector('[data-act="home"]').onclick = () => go("home");
  app.querySelector('[data-act="again"]').onclick = restart;
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
        <div class="card-title gem-title">${icon("gems", { size: 20 })} ${store.gems} gems</div>
        <p class="muted small-text">Earn gems by finishing lessons — better scores earn more. Spend ${store.rescueCost()} gems to refill your hearts and keep going when you run out mid-lesson, or to skip a failed lesson's retry cooldown.</p>
      </div>
      <div class="card"><div class="card-title">Achievements — ${s.achievements.length}/${ACHIEVEMENTS.length}</div>
        <div class="badges-grid">${achHtml}</div></div>
    </main>
    ${tabBar("rewards")}`;
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
          <div><b>${s.achievements.length}</b><span>Badges</span></div><div><b>${store.gems}</b><span>Gems</span></div>
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
 * Router + events + boot
 * ===================================================================== */
function render() {
  ({ home: renderHome, dashboard: renderDashboard, history: renderHistory, rewards: renderRewards, profile: renderProfile }[state.route] || renderHome)();
}

app.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-route]"); if (tab) return go(tab.dataset.route);
  const part = e.target.closest("[data-part]"); if (part && !part.disabled) return startPart(part.dataset.part);
  const utest = e.target.closest("[data-unittest]"); if (utest && !utest.disabled) return startUnitTest(utest.dataset.unittest);
  const cp = e.target.closest("[data-checkpoint]"); if (cp && !cp.disabled) return startCheckpoint(Number(cp.dataset.checkpoint));
  const hw = e.target.closest("[data-halfway]"); if (hw && !hw.disabled) return startHalfway(hw.dataset.halfway);
  const practice = e.target.closest("[data-practice]"); if (practice && !practice.disabled) return startPractice(practice.dataset.practice);
  const say = e.target.closest("[data-say]"); if (say) return speak(say.dataset.say);
});

render();
loadRecorded();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
