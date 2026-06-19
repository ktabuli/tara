/* =====================================================================
 * app.js — Tara! Learn Tagalog  (main application)
 * ---------------------------------------------------------------------
 * A mobile-first PWA. Renders all screens, handles navigation, and runs
 * the interactive lesson player with reading/writing/listening/speaking.
 * ===================================================================== */

import { COURSE, allLessons, lessonById, unitById } from "./curriculum.js";
import { store, ACHIEVEMENTS } from "./store.js";
import { buildExercises, checkAnswer, speak, listen, canListen, canSpeak, shuffle } from "./lessons.js";

const app = document.getElementById("app");
const COURSE_POOL = allLessons().flatMap((l) => l.vocab);

const state = { route: "home", params: {} };

/* ---------- tiny DOM helper ---------- */
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------- navigation ---------- */
function go(route, params = {}) {
  state.route = route;
  state.params = params;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}
window.addEventListener("hashchange", () => {});

/* =====================================================================
 * Top bar (stats) + bottom tab bar
 * ===================================================================== */
function statsBar() {
  const s = store.state;
  return `
    <header class="topbar">
      <div class="stat" title="Day streak">
        <span class="stat-ico">🔥</span><span class="stat-val">${s.streak}</span>
      </div>
      <div class="stat" title="Gems">
        <span class="stat-ico">💎</span><span class="stat-val">${s.gems}</span>
      </div>
      <div class="stat hearts" title="Hearts" data-act="hearts">
        <span class="stat-ico">❤️</span><span class="stat-val">${store.hearts}</span>
      </div>
      <div class="stat level-pill" title="Level ${store.level()}">
        <span class="stat-ico">⭐</span><span class="stat-val">Lv ${store.level()}</span>
      </div>
    </header>`;
}

function tabBar(active) {
  const tabs = [
    ["home", "🏠", "Learn"],
    ["dashboard", "📊", "Stats"],
    ["history", "🕘", "History"],
    ["rewards", "🏆", "Rewards"],
    ["profile", "👤", "Profile"]
  ];
  return `
    <nav class="tabbar">
      ${tabs.map(([r, i, l]) => `
        <button class="tab ${active === r ? "active" : ""}" data-route="${r}">
          <span class="tab-ico">${i}</span><span class="tab-label">${l}</span>
        </button>`).join("")}
    </nav>`;
}

/* =====================================================================
 * HOME — the learning path
 * ===================================================================== */
function renderHome() {
  const s = store.state;
  const goalPct = Math.round(store.todayProgress() * 100);

  const unitsHtml = COURSE.units.map((unit, ui) => {
    const lessonsHtml = unit.lessons.map((lesson, li) => {
      const completed = store.isCompleted(lesson.id);
      const stars = store.lessonStars(lesson.id);
      // A lesson is unlocked if it's the first overall, or the previous lesson is done.
      const flat = allLessons();
      const idx = flat.findIndex((l) => l.id === lesson.id);
      const unlocked = idx === 0 || store.isCompleted(flat[idx - 1].id);
      const skillIco = { reading: "📖", writing: "✏️", speaking: "🎤", listening: "🎧" }[lesson.skill] || "📘";
      const offset = (li % 2 === 0 ? 0 : 1);
      return `
        <button class="node ${completed ? "done" : unlocked ? "ready" : "locked"} pos-${offset}"
                data-lesson="${lesson.id}" ${unlocked ? "" : "disabled"}
                style="--unit-color:${unit.color}">
          <span class="node-circle">
            ${completed ? "✓" : unlocked ? skillIco : "🔒"}
          </span>
          <span class="node-stars">${"★".repeat(stars)}${"☆".repeat(completed ? 3 - stars : 0)}</span>
          <span class="node-title">${esc(lesson.title)}</span>
        </button>`;
    }).join("");

    return `
      <section class="unit">
        <div class="unit-banner" style="background:${unit.color}">
          <div>
            <div class="unit-kicker">UNIT ${ui + 1} · ${esc(unit.subtitle)}</div>
            <div class="unit-name">${unit.icon} ${esc(unit.title)}</div>
          </div>
        </div>
        <div class="path">${lessonsHtml}</div>
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
        <div class="goal-top">
          <span>Daily goal</span>
          <span>${s.todayXp} / ${store.dailyGoal()} XP</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${goalPct}%"></div></div>
      </div>

      ${unitsHtml}
      <div class="footer-note">Made with ❤️ for Tagalog learners</div>
    </main>
    ${tabBar("home")}
  `;
}

/* =====================================================================
 * LESSON PLAYER
 * ===================================================================== */
function startLesson(lessonId) {
  if (store.hearts <= 0) { go("hearts"); return; }
  const lesson = lessonById(lessonId);
  if (!lesson) { go("home"); return; }
  const exercises = buildExercises(lesson, COURSE_POOL);
  runLesson(lesson, exercises);
}

function runLesson(lesson, exercises) {
  let i = 0, correct = 0;
  const total = exercises.length;

  function paint() {
    if (i >= total) return finishLesson(lesson, correct, total);
    const ex = exercises[i];
    const pct = Math.round((i / total) * 100);

    app.innerHTML = `
      <div class="lesson-shell">
        <div class="lesson-top">
          <button class="icon-btn" data-act="quit">✕</button>
          <div class="bar lesson-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="hearts-mini">❤️ ${store.hearts}</div>
        </div>
        <div class="lesson-body" id="exbody"></div>
        <div class="lesson-foot" id="exfoot"></div>
      </div>`;

    const body = app.querySelector("#exbody");
    const foot = app.querySelector("#exfoot");
    renderExercise(ex, body, foot, (wasCorrect) => {
      if (wasCorrect) correct++;
      else store.loseHeart();
      if (store.hearts <= 0 && !wasCorrect) { return outOfHearts(lesson); }
      i++;
      paint();
    });
  }
  paint();
}

function feedbackBar(foot, correctness, answerText, onNext) {
  const fb = el(`
    <div class="feedback ${correctness ? "good" : "bad"}">
      <div class="fb-head">
        <span class="fb-ico">${correctness ? "✅" : "❌"}</span>
        <div>
          <div class="fb-title">${correctness ? "Tama! (Correct)" : "Almost!"}</div>
          ${correctness ? "" : `<div class="fb-sub">Answer: <b>${esc(answerText)}</b></div>`}
        </div>
      </div>
      <button class="btn ${correctness ? "btn-good" : "btn-bad"}" data-act="next">Continue</button>
    </div>`);
  foot.innerHTML = "";
  foot.appendChild(fb);
  fb.querySelector('[data-act="next"]').onclick = onNext;
}

function renderExercise(ex, body, foot, done) {
  const word = ex.word;

  /* ---- MULTIPLE CHOICE / LISTEN ---- */
  if (ex.type === "choose" || ex.type === "listen") {
    const isListen = ex.type === "listen";
    body.innerHTML = `
      <div class="ex-prompt">${esc(ex.prompt)}</div>
      ${isListen
        ? `<button class="speaker-big" data-act="play">🔊<span>Tap to listen</span></button>`
        : `<div class="ex-question">
             ${word?.emoji ? `<div class="ex-emoji">${word.emoji}</div>` : ""}
             <div class="ex-word">${esc(ex.question)}</div>
             ${ex.speakable ? `<button class="speaker-sm" data-act="play">🔊</button>` : ""}
           </div>`}
      <div class="options">
        ${ex.options.map((o) => `<button class="option" data-val="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>`;
    if (ex.speakable || isListen) {
      const p = body.querySelector('[data-act="play"]');
      if (p) p.onclick = () => speak(ex.speakable);
      if (isListen) setTimeout(() => speak(ex.speakable), 350);
    }
    let answered = false;
    body.querySelectorAll(".option").forEach((b) => {
      b.onclick = () => {
        if (answered) return; answered = true;
        const ok = checkAnswer(ex, b.dataset.val);
        b.classList.add(ok ? "correct" : "wrong");
        if (!ok) {
          body.querySelectorAll(".option").forEach((x) => { if (checkAnswer(ex, x.dataset.val)) x.classList.add("correct"); });
        }
        body.querySelectorAll(".option").forEach((x) => x.disabled = true);
        feedbackBar(foot, ok, ex.answer, () => done(ok));
      };
    });
    return;
  }

  /* ---- WRITE ---- */
  if (ex.type === "write") {
    body.innerHTML = `
      <div class="ex-prompt">${esc(ex.prompt)}</div>
      <div class="ex-question">
        ${word?.emoji ? `<div class="ex-emoji">${word.emoji}</div>` : ""}
        <div class="ex-word">${esc(ex.question)}</div>
      </div>
      <input class="text-input" id="answerInput" autocomplete="off" autocapitalize="off"
             spellcheck="false" placeholder="Type in Tagalog…" />
      <div class="hint">Tip: accents and punctuation don't matter.</div>`;
    const input = body.querySelector("#answerInput");
    setTimeout(() => input.focus(), 50);
    foot.innerHTML = `<button class="btn btn-primary" data-act="check">Check</button>`;
    const submit = () => {
      const ok = checkAnswer(ex, input.value);
      input.disabled = true;
      input.classList.add(ok ? "correct" : "wrong");
      feedbackBar(foot, ok, ex.answer, () => done(ok));
    };
    foot.querySelector('[data-act="check"]').onclick = submit;
    input.onkeydown = (e) => { if (e.key === "Enter") submit(); };
    return;
  }

  /* ---- SPEAK ---- */
  if (ex.type === "speak") {
    const supported = canListen();
    body.innerHTML = `
      <div class="ex-prompt">${esc(ex.prompt)}</div>
      <div class="ex-question speak-q">
        <div class="ex-word big">${esc(ex.question)}</div>
        ${ex.hint ? `<div class="say-guide">${esc(ex.hint)}</div>` : ""}
        <button class="speaker-sm" data-act="play">🔊 Hear it</button>
      </div>
      <div class="mic-wrap">
        <button class="mic-btn" data-act="mic" ${supported ? "" : "disabled"}>🎤</button>
        <div class="mic-status" id="micStatus">${supported ? "Tap the mic and say it" : "Speech input not supported on this browser"}</div>
        <div class="heard" id="heard"></div>
      </div>`;
    body.querySelector('[data-act="play"]').onclick = () => speak(ex.speakable);
    const status = body.querySelector("#micStatus");
    const heard = body.querySelector("#heard");

    if (!supported) {
      // graceful fallback — let them self-mark
      foot.innerHTML = `<button class="btn btn-primary" data-act="ok">I said it ✓</button>`;
      foot.querySelector('[data-act="ok"]').onclick = () => done(true);
      return;
    }

    const micBtn = body.querySelector('[data-act="mic"]');
    micBtn.onclick = async () => {
      heard.textContent = "";
      try {
        const transcript = await listen({
          onStart: () => { micBtn.classList.add("listening"); status.textContent = "Listening… 🎙️"; },
          onEnd: () => { micBtn.classList.remove("listening"); }
        });
        if (!transcript) { status.textContent = "Didn't catch that — try again"; return; }
        heard.innerHTML = `You said: <b>${esc(transcript.split(" | ")[0])}</b>`;
        const ok = checkAnswer(ex, transcript);
        status.textContent = ok ? "Great pronunciation!" : "Close — give it another go or continue";
        feedbackBar(foot, ok, ex.answer, () => done(ok));
      } catch (err) {
        status.textContent = "Mic unavailable — you can skip below";
        foot.innerHTML = `<button class="btn btn-primary" data-act="skip">Continue</button>`;
        foot.querySelector('[data-act="skip"]').onclick = () => done(true);
      }
    };
    return;
  }

  /* ---- MATCH PAIRS ---- */
  if (ex.type === "match") {
    const pairs = ex.pairs;
    const left = shuffle(pairs.map((p) => ({ k: p.tl, label: p.tl, match: p.en })));
    const right = shuffle(pairs.map((p) => ({ k: p.en, label: p.en, match: p.tl })));
    body.innerHTML = `
      <div class="ex-prompt">Tap the matching pairs</div>
      <div class="match-grid">
        <div class="match-col">${left.map((x) => `<button class="match-item" data-side="L" data-key="${esc(x.k)}" data-match="${esc(x.match)}">${esc(x.label)}</button>`).join("")}</div>
        <div class="match-col">${right.map((x) => `<button class="match-item" data-side="R" data-key="${esc(x.k)}" data-match="${esc(x.match)}">${esc(x.label)}</button>`).join("")}</div>
      </div>`;
    let selected = null, matched = 0, mistakes = 0;
    const items = [...body.querySelectorAll(".match-item")];
    items.forEach((it) => {
      it.onclick = () => {
        if (it.classList.contains("matched")) return;
        if (!selected) { selected = it; it.classList.add("selected"); if (it.dataset.side === "L") speak(it.dataset.key); return; }
        if (selected === it) { it.classList.remove("selected"); selected = null; return; }
        // check pair
        const isMatch = selected.dataset.match === it.dataset.key && it.dataset.match === selected.dataset.key;
        if (isMatch) {
          [selected, it].forEach((x) => { x.classList.remove("selected"); x.classList.add("matched"); x.disabled = true; });
          matched++;
          if (matched === pairs.length) {
            const ok = mistakes === 0;
            feedbackBar(foot, ok, "All matched!", () => done(true)); // matching always advances
          }
        } else {
          mistakes++;
          const a = selected, b = it;
          a.classList.add("badmatch"); b.classList.add("badmatch");
          setTimeout(() => { a.classList.remove("badmatch", "selected"); b.classList.remove("badmatch"); }, 600);
        }
        selected = null;
      };
    });
    return;
  }
}

function outOfHearts(lesson) {
  app.innerHTML = `
    <div class="center-screen">
      <div class="big-emoji">💔</div>
      <h2>Out of hearts</h2>
      <p>You ran out of hearts for this lesson. Refill to keep going, or come back later — hearts recharge over time.</p>
      <div class="stack">
        <button class="btn btn-primary" data-act="refill">💎 Refill (50 gems)</button>
        <button class="btn btn-ghost" data-act="home">Back to lessons</button>
      </div>
    </div>`;
  app.querySelector('[data-act="refill"]').onclick = () => {
    if (store.buyHeartsWithGems()) startLesson(lesson.id);
    else { app.querySelector('[data-act="refill"]').textContent = "Not enough gems 😅"; }
  };
  app.querySelector('[data-act="home"]').onclick = () => go("home");
}

function finishLesson(lesson, correct, total) {
  const result = store.completeLesson({ lessonId: lesson.id, title: `${lesson.title}`, correct, total });
  const pct = Math.round((correct / total) * 100);
  const stars = result.stars;
  const achHtml = result.newAchievements.length
    ? `<div class="ach-pop">
         <div class="ach-pop-title">🎉 New achievement${result.newAchievements.length > 1 ? "s" : ""}!</div>
         ${result.newAchievements.map((a) => `<div class="ach-line">${a.icon} <b>${esc(a.title)}</b> — ${esc(a.desc)}</div>`).join("")}
       </div>` : "";

  app.innerHTML = `
    <div class="center-screen finish">
      <div class="confetti">🎊</div>
      <div class="stars-row">${[1,2,3].map((n)=>`<span class="fstar ${n<=stars?"on":""}">★</span>`).join("")}</div>
      <h2>Lesson complete!</h2>
      <div class="result-cards">
        <div class="rc"><div class="rc-ico">🎯</div><div class="rc-val">${pct}%</div><div class="rc-lab">Accuracy</div></div>
        <div class="rc"><div class="rc-ico">⭐</div><div class="rc-val">+${result.xpGain}</div><div class="rc-lab">XP</div></div>
        <div class="rc"><div class="rc-ico">💎</div><div class="rc-val">+${result.gemGain}</div><div class="rc-lab">Gems</div></div>
      </div>
      ${achHtml}
      <div class="stack">
        <button class="btn btn-primary" data-act="continue">Continue</button>
        <button class="btn btn-ghost" data-act="again">Practice again</button>
      </div>
    </div>`;
  app.querySelector('[data-act="continue"]').onclick = () => go("home");
  app.querySelector('[data-act="again"]').onclick = () => startLesson(lesson.id);
}

/* =====================================================================
 * DASHBOARD
 * ===================================================================== */
function renderDashboard() {
  const s = store.state;
  const totalLessons = allLessons().length;
  const completed = store.completedCount();
  const overall = Math.round((completed / totalLessons) * 100);

  // last-7-days activity from history
  const days = [];
  for (let d = 6; d >= 0; d--) {
    const date = new Date(); date.setDate(date.getDate() - d);
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const xp = s.history.filter((h) => {
      const hd = new Date(h.at);
      const hk = `${hd.getFullYear()}-${String(hd.getMonth()+1).padStart(2,"0")}-${String(hd.getDate()).padStart(2,"0")}`;
      return hk === key;
    }).reduce((a, h) => a + h.xp, 0);
    days.push({ label: ["Su","Mo","Tu","We","Th","Fr","Sa"][date.getDay()], xp });
  }
  const maxXp = Math.max(30, ...days.map((d) => d.xp));

  const skillCounts = { reading: 0, writing: 0, speaking: 0, listening: 0 };
  allLessons().forEach((l) => { if (store.isCompleted(l.id)) skillCounts[l.skill] = (skillCounts[l.skill]||0)+1; });

  // per-unit progress
  const unitRows = COURSE.units.map((u) => {
    const done = u.lessons.filter((l) => store.isCompleted(l.id)).length;
    const pct = Math.round((done / u.lessons.length) * 100);
    return `
      <div class="unit-row">
        <div class="ur-name">${u.icon} ${esc(u.title)}</div>
        <div class="bar small"><div class="bar-fill" style="width:${pct}%;background:${u.color}"></div></div>
        <div class="ur-pct">${done}/${u.lessons.length}</div>
      </div>`;
  }).join("");

  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">📊 Your Progress</h1>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-ico">⭐</div><div class="kpi-val">${s.xp}</div><div class="kpi-lab">Total XP</div></div>
        <div class="kpi"><div class="kpi-ico">🔥</div><div class="kpi-val">${s.streak}</div><div class="kpi-lab">Day streak</div></div>
        <div class="kpi"><div class="kpi-ico">📈</div><div class="kpi-val">Lv ${store.level()}</div><div class="kpi-lab">Level</div></div>
        <div class="kpi"><div class="kpi-ico">✅</div><div class="kpi-val">${completed}</div><div class="kpi-lab">Lessons</div></div>
      </div>

      <div class="card">
        <div class="card-title">Level ${store.level()} progress</div>
        <div class="bar"><div class="bar-fill" style="width:${Math.round(store.levelProgress()*100)}%"></div></div>
        <div class="muted small-text">${100 - (s.xp % 100)} XP to level ${store.level()+1}</div>
      </div>

      <div class="card">
        <div class="card-title">Last 7 days</div>
        <div class="chart">
          ${days.map((d) => `
            <div class="chart-col">
              <div class="chart-bar" style="height:${Math.max(4, Math.round((d.xp/maxXp)*100))}%" title="${d.xp} XP"></div>
              <div class="chart-lab">${d.label}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Course completion — ${overall}%</div>
        <div class="bar"><div class="bar-fill" style="width:${overall}%"></div></div>
        <div class="unit-rows">${unitRows}</div>
      </div>

      <div class="card">
        <div class="card-title">Skills practiced</div>
        <div class="skill-grid">
          <div class="skill-cell">📖<b>${skillCounts.reading}</b><span>Reading</span></div>
          <div class="skill-cell">✏️<b>${skillCounts.writing}</b><span>Writing</span></div>
          <div class="skill-cell">🎤<b>${skillCounts.speaking}</b><span>Speaking</span></div>
          <div class="skill-cell">🎧<b>${skillCounts.listening}</b><span>Listening</span></div>
        </div>
      </div>
    </main>
    ${tabBar("dashboard")}
  `;
}

/* =====================================================================
 * HISTORY — review past lessons, replay, check off
 * ===================================================================== */
function renderHistory() {
  const flat = allLessons();
  const lessonsHtml = flat.map((l) => {
    const done = store.isCompleted(l.id);
    const stars = store.lessonStars(l.id);
    const info = store.state.lessons[l.id];
    const when = info?.completedAt ? new Date(info.completedAt).toLocaleDateString() : "";
    const skillIco = { reading: "📖", writing: "✏️", speaking: "🎤", listening: "🎧" }[l.skill];
    return `
      <div class="hist-row ${done ? "done" : ""}">
        <div class="hist-check">${done ? "✅" : "⬜"}</div>
        <div class="hist-main">
          <div class="hist-title">${skillIco} ${esc(l.title)}</div>
          <div class="hist-sub">${esc(l.unitTitle)} ${done ? `· ${"★".repeat(stars)}${"☆".repeat(3-stars)} · ${when}` : "· Not started"}</div>
        </div>
        <button class="btn-sm" data-replay="${l.id}">${done ? "Review" : "Start"}</button>
      </div>`;
  }).join("");

  const recent = store.state.history.slice(0, 12).map((h) => {
    const dt = new Date(h.at);
    return `<div class="recent-row">
      <span>${esc(h.title)}</span>
      <span class="muted">${"★".repeat(h.stars)} · +${h.xp} XP · ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
    </div>`;
  }).join("") || `<div class="muted">No activity yet — finish a lesson to see it here.</div>`;

  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">🕘 Lessons & History</h1>
      <div class="card">
        <div class="card-title">All lessons</div>
        <div class="hist-list">${lessonsHtml}</div>
      </div>
      <div class="card">
        <div class="card-title">Recent activity</div>
        <div class="recent-list">${recent}</div>
      </div>
    </main>
    ${tabBar("history")}
  `;
}

/* =====================================================================
 * REWARDS — achievements + gem shop
 * ===================================================================== */
function renderRewards() {
  const s = store.state;
  const achHtml = ACHIEVEMENTS.map((a) => {
    const got = store.hasAchievement(a.id);
    return `
      <div class="badge ${got ? "earned" : "locked"}">
        <div class="badge-ico">${got ? a.icon : "🔒"}</div>
        <div class="badge-title">${esc(a.title)}</div>
        <div class="badge-desc">${esc(a.desc)}</div>
      </div>`;
  }).join("");
  const earned = s.achievements.length;

  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">🏆 Rewards</h1>

      <div class="card shop-card">
        <div class="card-title">💎 ${s.gems} gems</div>
        <p class="muted small-text">Earn gems by finishing lessons. The better your score, the more you earn.</p>
        <button class="btn btn-primary" data-act="buyhearts">Refill hearts — 50 💎</button>
      </div>

      <div class="card">
        <div class="card-title">Achievements — ${earned}/${ACHIEVEMENTS.length}</div>
        <div class="badges-grid">${achHtml}</div>
      </div>
    </main>
    ${tabBar("rewards")}
  `;
  app.querySelector('[data-act="buyhearts"]').onclick = (e) => {
    if (store.buyHeartsWithGems()) { e.target.textContent = "Hearts refilled! ❤️"; setTimeout(()=>render(),700); }
    else e.target.textContent = store.hearts >= 5 ? "Hearts already full ❤️" : "Not enough gems 😅";
  };
}

/* =====================================================================
 * PROFILE / settings
 * ===================================================================== */
function renderProfile() {
  const s = store.state;
  const joined = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "today";
  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">👤 Profile</h1>
      <div class="card profile-head">
        <div class="avatar">🐃</div>
        <div>
          <div class="profile-name">Tagalog Learner</div>
          <div class="muted small-text">Learning Tagalog · Joined ${joined}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Summary</div>
        <div class="summary-grid">
          <div><b>${s.xp}</b><span>XP</span></div>
          <div><b>${store.level()}</b><span>Level</span></div>
          <div><b>${s.bestStreak}</b><span>Best streak</span></div>
          <div><b>${store.completedCount()}</b><span>Lessons</span></div>
          <div><b>${s.achievements.length}</b><span>Badges</span></div>
          <div><b>${s.gems}</b><span>Gems</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Settings</div>
        <label class="setting-row">
          <span>🔊 Speech speed</span>
          <input type="range" min="0.5" max="1.2" step="0.05" value="${s.settings.ttsRate}" id="rate">
        </label>
        <button class="btn btn-ghost" data-act="testvoice">Test voice 🔉</button>
        <div class="muted small-text">${canSpeak() ? "Speech playback available" : "⚠️ Your browser has no speech voices"} · ${canListen() ? "Microphone input available" : "⚠️ No speech recognition in this browser"}</div>
      </div>

      <div class="card danger">
        <div class="card-title">Reset</div>
        <p class="muted small-text">Erase all progress, XP, streaks and achievements. This can't be undone.</p>
        <button class="btn btn-danger" data-act="reset">Reset all progress</button>
      </div>
      <div class="footer-note">Tara! — Learn Tagalog · works offline · v1.0</div>
    </main>
    ${tabBar("profile")}
  `;
  const rate = app.querySelector("#rate");
  rate.oninput = () => { store.state.settings.ttsRate = parseFloat(rate.value); store.save(); };
  app.querySelector('[data-act="testvoice"]').onclick = () => speak("Kumusta! Magandang araw sa iyo.");
  app.querySelector('[data-act="reset"]').onclick = () => {
    if (confirm("Reset ALL progress? This cannot be undone.")) { store.reset(); go("home"); }
  };
}

/* =====================================================================
 * Hearts info screen
 * ===================================================================== */
function renderHearts() {
  const ms = store.msUntilNextHeart();
  const mins = Math.ceil(ms / 60000);
  app.innerHTML = `
    ${statsBar()}
    <main class="screen">
      <h1 class="page-title">❤️ Hearts</h1>
      <div class="card center-card">
        <div class="big-emoji">${"❤️".repeat(store.hearts)}${"🤍".repeat(5 - store.hearts)}</div>
        <p>You have <b>${store.hearts}</b> of 5 hearts.</p>
        <p class="muted small-text">${store.hearts >= 5 ? "Hearts are full!" : `Next heart in about ${mins} min. Hearts also refill as you take lessons.`}</p>
        <button class="btn btn-primary" data-act="buy">Refill now — 50 💎</button>
        <button class="btn btn-ghost" data-act="back">Back</button>
      </div>
    </main>
    ${tabBar("home")}
  `;
  app.querySelector('[data-act="buy"]').onclick = (e) => {
    if (store.buyHeartsWithGems()) go("home"); else e.target.textContent = "Not enough gems 😅";
  };
  app.querySelector('[data-act="back"]').onclick = () => go("home");
}

/* =====================================================================
 * Render dispatcher + global event delegation
 * ===================================================================== */
function render() {
  switch (state.route) {
    case "home": renderHome(); break;
    case "dashboard": renderDashboard(); break;
    case "history": renderHistory(); break;
    case "rewards": renderRewards(); break;
    case "profile": renderProfile(); break;
    case "hearts": renderHearts(); break;
    default: renderHome();
  }
}

app.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-route]");
  if (tab) return go(tab.dataset.route);

  const lesson = e.target.closest("[data-lesson]");
  if (lesson && !lesson.disabled) return startLesson(lesson.dataset.lesson);

  const replay = e.target.closest("[data-replay]");
  if (replay) return startLesson(replay.dataset.replay);

  const quit = e.target.closest('[data-act="quit"]');
  if (quit) { if (confirm("Quit this lesson? Progress in this lesson won't be saved.")) go("home"); return; }

  const heartsBtn = e.target.closest('[data-act="hearts"]');
  if (heartsBtn) return go("hearts");
});

/* keep stats fresh (heart regen) */
store.subscribe(() => {});

/* boot */
render();

/* register service worker for offline / installable PWA */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
