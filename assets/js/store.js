/* =====================================================================
 * store.js — Persistent learner state (localStorage)
 * ---------------------------------------------------------------------
 * Tracks XP, gems, hearts, daily streak, per-lesson completion history,
 * and unlocked achievements. Everything is saved to the browser so the
 * learner's progress survives reloads and works fully offline.
 * ===================================================================== */

const KEY = "tara_tagalog_state_v1";
const DAILY_GOAL_XP = 30; // XP to count a day toward the streak

const DEFAULT_STATE = {
  createdAt: null,
  xp: 0,
  gems: 0,
  hearts: 5,
  heartsUpdatedAt: null,
  streak: 0,
  bestStreak: 0,
  lastActiveDate: null,   // YYYY-MM-DD of last day goal was met
  todayXp: 0,
  todayDate: null,        // YYYY-MM-DD this todayXp belongs to
  lessons: {},            // { [lessonId]: { stars, attempts, lastScore, completedAt } }
  history: [],            // [{ lessonId, title, score, total, xp, at }]
  achievements: [],       // [achievementId]
  settings: { sound: true, ttsRate: 0.85 }
};

const MAX_HEARTS = 5;
const HEART_REFILL_MIN = 25; // minutes to regenerate one heart

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
    this._regenHearts();
    this.save();
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...structuredClone(DEFAULT_STATE), createdAt: Date.now(), heartsUpdatedAt: Date.now() };
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...parsed };
    } catch (e) {
      return { ...structuredClone(DEFAULT_STATE), createdAt: Date.now(), heartsUpdatedAt: Date.now() };
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

  /* --- passive heart regeneration --- */
  _regenHearts() {
    if (this.state.hearts >= MAX_HEARTS) {
      this.state.heartsUpdatedAt = Date.now();
      return;
    }
    const now = Date.now();
    const last = this.state.heartsUpdatedAt || now;
    const gained = Math.floor((now - last) / (HEART_REFILL_MIN * 60000));
    if (gained > 0) {
      this.state.hearts = Math.min(MAX_HEARTS, this.state.hearts + gained);
      this.state.heartsUpdatedAt = this.state.hearts >= MAX_HEARTS ? now : last + gained * HEART_REFILL_MIN * 60000;
    }
  }

  /* --- hearts --- */
  loseHeart() {
    this._regenHearts();
    if (this.state.hearts > 0) this.state.hearts -= 1;
    if (this.state.hearts === MAX_HEARTS - 1) this.state.heartsUpdatedAt = Date.now();
    this.save();
    return this.state.hearts;
  }

  refillHearts() {
    this.state.hearts = MAX_HEARTS;
    this.state.heartsUpdatedAt = Date.now();
    this.save();
  }

  buyHeartsWithGems() {
    if (this.state.gems >= 50 && this.state.hearts < MAX_HEARTS) {
      this.state.gems -= 50;
      this.refillHearts();
      return true;
    }
    return false;
  }

  get hearts() { this._regenHearts(); return this.state.hearts; }

  msUntilNextHeart() {
    if (this.state.hearts >= MAX_HEARTS) return 0;
    const last = this.state.heartsUpdatedAt || Date.now();
    return Math.max(0, last + HEART_REFILL_MIN * 60000 - Date.now());
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
    this.state = { ...structuredClone(DEFAULT_STATE), createdAt: Date.now(), heartsUpdatedAt: Date.now() };
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
  { id: "speaker", icon: "🎤", title: "Speak Up", desc: "Finish a speaking lesson", test: (s) => ["u2l2", "u3l2", "u4l2", "u6l1"].some((id) => s.lessons[id]) },
  { id: "gem_collector", icon: "💎", title: "Gem Collector", desc: "Save up 50 gems", test: (s) => s.gems >= 50 }
];

export const store = new Store();
