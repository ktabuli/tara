import "./helpers/setup.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { store, ACHIEVEMENTS } from "../assets/js/store.js";

beforeEach(() => store.reset());

test("fresh state defaults", () => {
  assert.equal(store.hearts, 5);
  assert.equal(store.state.xp, 0);
  assert.equal(store.state.streak, 0);
  assert.equal(store.state.gems, 0);
  assert.equal(store.completedCount(), 0);
  assert.equal(store.mistakeList().length, 0);
});

test("hearts: lose, buy with gems", () => {
  assert.equal(store.loseHeart(), 4);
  assert.equal(store.loseHeart(), 3);

  assert.equal(store.buyHeartsWithGems(), false); // not enough gems
  store.state.gems = 50;
  assert.equal(store.buyHeartsWithGems(), true);
  assert.equal(store.hearts, 5);
  assert.equal(store.state.gems, 0);
  assert.equal(store.buyHeartsWithGems(), false); // already full
});

test("hearts regenerate over time", () => {
  store.state.hearts = 2;
  store.state.heartsUpdatedAt = Date.now() - 60 * 60000; // 60 min ago, refill = 25 min
  assert.equal(store.hearts, 4); // +2 regenerated, capped sensibly
});

test("completeLesson: perfect score", () => {
  const r = store.completeLesson({ lessonId: "u1l1p1", title: "Greetings · 1", correct: 7, total: 7 });
  assert.equal(r.stars, 3);
  assert.equal(r.xpGain, 20);       // 10 base + 10 bonus
  assert.equal(r.gemGain, 5);
  assert.equal(store.state.xp, 20);
  assert.ok(store.isCompleted("u1l1p1"));
  assert.equal(store.completedCount(), 1);
  assert.equal(store.state.streak, 1);     // any lesson today => streak 1
  assert.equal(store.state.todayXp, 20);
});

test("completeLesson: partial score and star thresholds", () => {
  const r = store.completeLesson({ lessonId: "u1l1p1", title: "x", correct: 4, total: 7 });
  assert.equal(r.stars, 1);                 // 0.57 -> 1 star
  assert.equal(r.xpGain, 16);               // 10 + round(0.571*10)=6
});

test("streak only counts once per day", () => {
  store.completeLesson({ lessonId: "u1l1p1", title: "x", correct: 5, total: 5 });
  store.completeLesson({ lessonId: "u1l2p1", title: "y", correct: 5, total: 5 });
  assert.equal(store.state.streak, 1);
  assert.equal(store.completedCount(), 2);
});

test("mistakes: record, count, list and clear", () => {
  const w = { tl: "Salamat", en: "Thank you", say: "sa-LA-mat" };
  store.recordMistake(w);
  store.recordMistake(w);
  assert.equal(store.mistakeList().length, 1);
  assert.equal(store.state.mistakes["Salamat"].misses, 2);

  store.recordMistake({ tl: "Oo", en: "Yes", say: "O-o" });
  assert.equal(store.mistakeList().length, 2);

  store.clearMistake("Salamat");
  assert.equal(store.mistakeList().length, 1);
  assert.equal(store.state.mistakes["Salamat"], undefined);
});

test("practiceResult awards XP but never completes a lesson", () => {
  const r = store.practiceResult({ correct: 3, total: 4, title: "Word practice" });
  assert.ok(r.xpGain > 0);
  assert.equal(store.completedCount(), 0);                 // lessons untouched
  assert.equal(store.state.history[0].lessonId, "practice");
  assert.ok(store.state.xp > 0);
});

test("unitTestResult: pass at >=80%, keeps best, stays passed after a worse retake", () => {
  let r = store.unitTestResult({ unitId: "u1", title: "U1 test", correct: 9, total: 10 }); // 90%
  assert.equal(r.pct, 90);
  assert.ok(r.passed);
  assert.ok(r.firstPass);
  assert.equal(store.unitTestPassed("u1"), true);
  assert.equal(store.unitTestBest("u1"), 90);

  r = store.unitTestResult({ unitId: "u1", title: "U1 test", correct: 5, total: 10 }); // 50% retake
  assert.equal(r.passed, false);                 // this attempt failed
  assert.equal(store.unitTestBest("u1"), 90);    // best retained
  assert.equal(store.unitTestPassed("u1"), true); // still passed overall
});

test("unitTestResult below 80% does not pass", () => {
  const r = store.unitTestResult({ unitId: "u3", title: "x", correct: 7, total: 10 }); // 70%
  assert.equal(r.passed, false);
  assert.equal(store.unitTestPassed("u3"), false);
});

test("passing a unit test unlocks the Unit Master achievement", () => {
  const r = store.unitTestResult({ unitId: "u1", title: "x", correct: 10, total: 10 });
  assert.ok(r.newAchievements.map((a) => a.id).includes("unit_master"));
});

test("checkpointResult records a review without completing lessons", () => {
  const r = store.checkpointResult({ id: "cp1", title: "Checkpoint 1", correct: 8, total: 10 });
  assert.equal(r.pct, 80);
  assert.ok(r.xpGain > 0);
  assert.ok(store.checkpointDone("cp1"));
  assert.equal(store.checkpointBest("cp1"), 80);
  assert.equal(store.completedCount(), 0); // lessons untouched
  assert.ok(r.newAchievements.map((a) => a.id).includes("reviewer"));
});

test("levels: 100 XP per level", () => {
  assert.equal(store.level(), 1);
  store.state.xp = 250;
  assert.equal(store.level(), 3);
  assert.ok(Math.abs(store.levelProgress() - 0.5) < 1e-9);
});

test("achievements unlock on milestones", () => {
  const r = store.completeLesson({ lessonId: "u1l1p1", title: "x", correct: 7, total: 7 });
  const ids = r.newAchievements.map((a) => a.id);
  assert.ok(ids.includes("first_steps"));
  assert.ok(ids.includes("perfect"));   // 3 stars
  assert.ok(store.hasAchievement("first_steps"));
});

test("ACHIEVEMENTS are well-formed", () => {
  assert.ok(ACHIEVEMENTS.length >= 1);
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.id && a.icon && a.title && a.desc);
    assert.equal(typeof a.test, "function");
  }
});

test("reset clears all progress", () => {
  store.completeLesson({ lessonId: "u1l1p1", title: "x", correct: 7, total: 7 });
  store.recordMistake({ tl: "Oo", en: "Yes", say: "O-o" });
  store.loseHeart();
  store.reset();
  assert.equal(store.state.xp, 0);
  assert.equal(store.completedCount(), 0);
  assert.equal(store.mistakeList().length, 0);
  assert.equal(store.hearts, 5);
});
