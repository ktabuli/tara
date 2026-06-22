/* =====================================================================
 * store.js — Persistent learner state (localStorage)
 * ---------------------------------------------------------------------
 * Tracks XP, gems, daily streak, per-lesson completion history,
 * and unlocked achievements. Everything is saved to the browser so the
 * learner's progress survives reloads and works fully offline.
 * ===================================================================== */

const KEY = "tara_tagalog_state_v1";
const DAILY_GOAL_XP = 30; // XP to count a day toward the streak

const DEFAULT_STATE = {
  createdAt: null,
  xp: 0,
  gems: 15,               // accumulating currency — start with a base of 15
  streak: 0,
  bestStreak: 0,
  lastActiveDate: null,   // YYYY-MM-DD of last day goal was met
  todayXp: 0,
  todayDate: null,        // YYYY-MM-DD this todayXp belongs to
  lessons: {},            // { [lessonId]: { stars, attempts, lastScore, completedAt } }
  history: [],            // [{ lessonId, title, score, total, xp, at }]
  achievements: [],       // [achievementId]
  mistakes: {},           // { [tl]: { tl, en, say, emoji, misses, at } } — words to review
  unitTests: {},          // { [unitId]: { bestPct, passed, attempts, at } }
  checkpoints: {},        // { [cpId]: { bestPct, attempts, done, at } } — cumulative reviews
  cooldowns: {},          // { [nodeId]: epochMs } — node locked until this time after a fail
  settings: { sound: true, ttsRate: 0.85 }
};

const COOLDOWN_MIN = 5;   // minutes a failed node is locked before retry
const RESCUE_COST = 10;   // gems to refill hearts mid-node or skip a cooldown

function todayStr(d = new Date()) {
  // Local date as YYYY-MM-DD
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(aStr, bStr) {
  const a = new Date(aStr + "T00:00:00");
  const b = new Date(bStr + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

class Store {
  constructor() {
    this.state = this._load();
    this._listeners = new Set();
    this._rollOver();
    this.save();
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...structuredClone(DEFAULT_STATE), createdAt: Date.now() };
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...parsed };
    } catch (e) {
      return { ...structuredClone(DEFAULT_STATE), createdAt: Date.now() };
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch (e) { /* storage full / disabled — non-fatal */ }
    this._emit();
  }

  subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  _emit() { this._listeners.forEach((fn) => fn(this.state)); }

  /* --- daily roll-over: reset today's XP, break streak if a day skipped --- */
  _rollOver() {
    const t = todayStr();
    if (this.state.todayDate !== t) {
      this.state.todayDate = t;
      this.state.todayXp = 0;
    }
    // If the last active day is older than yesterday, the streak is broken.
    if (this.state.lastActiveDate) {
      const gap = daysBetween(this.state.lastActiveDate, t);
      if (gap > 1) this.state.streak = 0;
    }
  }

  /* --- gems (accumulating currency) --- */
  get gems() { return this.state.gems; }
  spendGems(n = RESCUE_COST) {
    if (this.state.gems >= n) { this.state.gems -= n; this.save(); return true; }
    return false;
  }
  rescueCost() { return RESCUE_COST; }

  /* --- per-node fail cooldown --- */
  setCooldown(nodeId) {
    this.state.cooldowns[nodeId] = Date.now() + COOLDOWN_MIN * 60000;
    this.save();
  }
  cooldownRemaining(nodeId) {
    const until = this.state.cooldowns[nodeId] || 0;
    return Math.max(0, until - Date.now());
  }
  clearCooldown(nodeId) {
    if (this.state.cooldowns[nodeId]) { delete this.state.cooldowns[nodeId]; this.save(); }
  }

  /* --- complete a lesson --- */
  completeLesson({ lessonId, title, correct, total }) {
    const score = total > 0 ? correct / total : 0;
    const stars = score >= 0.95 ? 3 : score >= 0.75 ? 2 : score >= 0.5 ? 1 : 0;
    const baseXp = 10;
    const bonus = Math.round(score * 10);
    const xpGain = baseXp + bonus;
    const gemGain = stars === 3 ? 5 : stars === 2 ? 3 : 1;

    const prev = this.state.lessons[lessonId];
    this.state.lessons[lessonId] = {
      stars: Math.max(stars, prev?.stars || 0),
      attempts: (prev?.attempts || 0) + 1,
      lastScore: score,
      completedAt: Date.now()
    };

    this.state.xp += xpGain;
    this.state.gems += gemGain;

    // Daily XP + streak handling
    const t = todayStr();
    if (this.state.todayDate !== t) { this.state.todayDate = t; this.state.todayXp = 0; }
    this.state.todayXp += xpGain;

    // Streak: finishing ANY lesson counts the day toward your streak.
    // (The daily XP goal is a separate motivator shown on the home screen.)
    if (this.state.lastActiveDate !== t) {
      const gap = this.state.lastActiveDate ? daysBetween(this.state.lastActiveDate, t) : 99;
      this.state.streak = gap === 1 ? this.state.streak + 1 : 1;
      this.state.lastActiveDate = t;
      this.state.bestStreak = Math.max(this.state.bestStreak, this.state.streak);
    }

    this.state.history.unshift({ lessonId, title, score: correct, total, xp: xpGain, stars, at: Date.now() });
    if (this.state.history.length > 100) this.state.history.length = 100;

    const newAchievements = this._checkAchievements();
    this.save();
    return { xpGain, gemGain, stars, newAchievements };
  }

  /* --- mistakes (words to review) --- */
  recordMistake(w) {
    if (!w || !w.tl) return;
    const m = this.state.mistakes[w.tl] || { tl: w.tl, en: w.en, say: w.say, emoji: w.emoji, misses: 0 };
    m.misses = (m.misses || 0) + 1;
    m.at = Date.now();
    this.state.mistakes[w.tl] = m;
    this.save();
  }
  clearMistake(tl) {
    if (this.state.mistakes[tl]) { delete this.state.mistakes[tl]; this.save(); }
  }
  mistakeList() { return Object.values(this.state.mistakes).sort((a, b) => b.at - a.at); }

  /* --- practice session result (review hub) — does NOT complete a lesson --- */
  practiceResult({ correct, total, title }) {
    const score = total > 0 ? correct / total : 0;
    const xpGain = 5 + Math.round(score * 10);
    const gemGain = score >= 0.8 ? 2 : 1;
    this.state.xp += xpGain;
    this.state.gems += gemGain;

    const t = todayStr();
    if (this.state.todayDate !== t) { this.state.todayDate = t; this.state.todayXp = 0; }
    this.state.todayXp += xpGain;
    if (this.state.lastActiveDate !== t) {
      const gap = this.state.lastActiveDate ? daysBetween(this.state.lastActiveDate, t) : 99;
      this.state.streak = gap === 1 ? this.state.streak + 1 : 1;
      this.state.lastActiveDate = t;
      this.state.bestStreak = Math.max(this.state.bestStreak, this.state.streak);
    }
    this.state.history.unshift({ lessonId: "practice", title, score: correct, total, xp: xpGain, stars: 0, at: Date.now() });
    if (this.state.history.length > 100) this.state.history.length = 100;

    const newAchievements = this._checkAchievements();
    this.save();
    return { xpGain, gemGain, newAchievements };
  }

  /* --- unit test (final assessment per unit; 80% to pass) --- */
  unitTestResult({ unitId, title, correct, total }) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= 80;
    const stars = pct >= 95 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0;
    const xpGain = 20 + Math.round((pct / 100) * 30);
    const gemGain = passed ? 10 : 3;
    this.state.xp += xpGain;
    this.state.gems += gemGain;

    const prev = this.state.unitTests[unitId];
    const firstPass = passed && !(prev && prev.passed);
    this.state.unitTests[unitId] = {
      bestPct: Math.max(pct, prev?.bestPct || 0),
      passed: passed || !!(prev && prev.passed),
      attempts: (prev?.attempts || 0) + 1,
      at: Date.now()
    };

    const t = todayStr();
    if (this.state.todayDate !== t) { this.state.todayDate = t; this.state.todayXp = 0; }
    this.state.todayXp += xpGain;
    if (this.state.lastActiveDate !== t) {
      const gap = this.state.lastActiveDate ? daysBetween(this.state.lastActiveDate, t) : 99;
      this.state.streak = gap === 1 ? this.state.streak + 1 : 1;
      this.state.lastActiveDate = t;
      this.state.bestStreak = Math.max(this.state.bestStreak, this.state.streak);
    }
    this.state.history.unshift({ lessonId: "unittest:" + unitId, title, score: correct, total, xp: xpGain, stars, at: Date.now() });
    if (this.state.history.length > 100) this.state.history.length = 100;

    const newAchievements = this._checkAchievements();
    this.save();
    return { pct, passed, stars, xpGain, gemGain, firstPass, newAchievements };
  }
  unitTestPassed(unitId) { return !!(this.state.unitTests[unitId] && this.state.unitTests[unitId].passed); }
  unitTestBest(unitId) { return this.state.unitTests[unitId]?.bestPct || 0; }
  unitTestTaken(unitId) { return !!this.state.unitTests[unitId]; } // required gate clears once taken (any score)

  /* --- checkpoint (cumulative mixed review every few lessons) --- */
  checkpointResult({ id, title, correct, total }) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const xpGain = 25 + Math.round((pct / 100) * 35);
    const gemGain = 5 + (pct >= 80 ? 5 : 0);
    this.state.xp += xpGain;
    this.state.gems += gemGain;

    const prev = this.state.checkpoints[id];
    this.state.checkpoints[id] = {
      bestPct: Math.max(pct, prev?.bestPct || 0),
      // a checkpoint only "passes" (clears the gate) at >= 30%
      attempts: (prev?.attempts || 0) + 1, done: (prev?.done || pct >= 30), at: Date.now()
    };

    const t = todayStr();
    if (this.state.todayDate !== t) { this.state.todayDate = t; this.state.todayXp = 0; }
    this.state.todayXp += xpGain;
    if (this.state.lastActiveDate !== t) {
      const gap = this.state.lastActiveDate ? daysBetween(this.state.lastActiveDate, t) : 99;
      this.state.streak = gap === 1 ? this.state.streak + 1 : 1;
      this.state.lastActiveDate = t;
      this.state.bestStreak = Math.max(this.state.bestStreak, this.state.streak);
    }
    this.state.history.unshift({ lessonId: "checkpoint:" + id, title, score: correct, total, xp: xpGain, stars: 0, at: Date.now() });
    if (this.state.history.length > 100) this.state.history.length = 100;

    const newAchievements = this._checkAchievements();
    this.save();
    return { pct, xpGain, gemGain, newAchievements };
  }
  checkpointDone(id) { return !!(this.state.checkpoints[id] && this.state.checkpoints[id].done); }
  checkpointBest(id) { return this.state.checkpoints[id]?.bestPct || 0; }

  /* --- progress helpers --- */
  isCompleted(lessonId) { return !!this.state.lessons[lessonId]; }
  lessonStars(lessonId) { return this.state.lessons[lessonId]?.stars || 0; }
  completedCount() { return Object.keys(this.state.lessons).length; }
  dailyGoal() { return DAILY_GOAL_XP; }
  todayProgress() { return Math.min(1, this.state.todayXp / DAILY_GOAL_XP); }

  level() {
    // 100 XP per level, gently increasing feel
    return Math.floor(this.state.xp / 100) + 1;
  }
  levelProgress() { return (this.state.xp % 100) / 100; }

  /* --- achievements --- */
  _checkAchievements() {
    const unlocked = [];
    const have = new Set(this.state.achievements);
    const def = ACHIEVEMENTS;
    for (const a of def) {
      if (!have.has(a.id) && a.test(this.state, this)) {
        this.state.achievements.push(a.id);
        unlocked.push(a);
      }
    }
    return unlocked;
  }

  hasAchievement(id) { return this.state.achievements.includes(id); }

  reset() {
    this.state = { ...structuredClone(DEFAULT_STATE), createdAt: Date.now() };
    this.save();
  }
}

export const ACHIEVEMENTS = [
  { id: "first_steps", icon: "🐣", title: "First Steps", desc: "Finish your first lesson", test: (s) => Object.keys(s.lessons).length >= 1 },
  { id: "streak_3", icon: "🔥", title: "On Fire", desc: "Reach a 3-day streak", test: (s) => s.streak >= 3 },
  { id: "streak_7", icon: "⚡", title: "Unstoppable", desc: "Reach a 7-day streak", test: (s) => s.streak >= 7 },
  { id: "xp_100", icon: "⭐", title: "Century", desc: "Earn 100 XP", test: (s) => s.xp >= 100 },
  { id: "xp_500", icon: "🌟", title: "High Roller", desc: "Earn 500 XP", test: (s) => s.xp >= 500 },
  { id: "perfect", icon: "💯", title: "Flawless", desc: "Get 3 stars on a lesson", test: (s) => Object.values(s.lessons).some((l) => l.stars === 3) },
  { id: "ten_lessons", icon: "📚", title: "Bookworm", desc: "Complete 10 lessons", test: (s) => Object.keys(s.lessons).length >= 10 },
  { id: "speaker", icon: "🎤", title: "Speak Up", desc: "Finish a speaking lesson", test: (s) => ["u2l2", "u3l2", "u4l2", "u6l1"].some((id) => Object.keys(s.lessons).some((k) => k.startsWith(id))) },
  { id: "gem_collector", icon: "💎", title: "Gem Collector", desc: "Save up 50 gems", test: (s) => s.gems >= 50 },
  { id: "unit_master", icon: "🎓", title: "Unit Master", desc: "Pass your first unit test", test: (s) => Object.values(s.unitTests || {}).some((u) => u.passed) },
  { id: "graduate", icon: "🏅", title: "Graduate", desc: "Pass all 6 unit tests", test: (s) => Object.values(s.unitTests || {}).filter((u) => u.passed).length >= 6 },
  { id: "reviewer", icon: "🧠", title: "Memory Master", desc: "Finish a checkpoint review", test: (s) => Object.keys(s.checkpoints || {}).length >= 1 }
];

export const store = new Store();
