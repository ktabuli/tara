import "./helpers/setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { COURSE, allLessons, lessonById, unitById } from "../assets/js/curriculum.js";

test("course has 6 units with unique ids and required fields", () => {
  assert.equal(COURSE.units.length, 6);
  const ids = COURSE.units.map((u) => u.id);
  assert.equal(new Set(ids).size, 6);
  for (const u of COURSE.units) {
    assert.ok(u.title && u.subtitle, `${u.id} has title/subtitle`);
    assert.match(u.color, /^#[0-9A-Fa-f]{6}$/, `${u.id} has a hex colour`);
    assert.ok(Array.isArray(u.lessons) && u.lessons.length >= 1);
  }
});

test("exactly 12 lessons, all with unique ids", () => {
  const lessons = allLessons();
  assert.equal(lessons.length, 12);
  assert.equal(new Set(lessons.map((l) => l.id)).size, 12);
});

test("every lesson has valid vocab, tip, sentences, reading and quiz", () => {
  const skills = new Set(["reading", "writing", "speaking", "listening"]);
  for (const l of allLessons()) {
    assert.ok(skills.has(l.skill), `${l.id} skill is valid`);

    // vocab
    assert.ok(l.vocab.length >= 1, `${l.id} has vocab`);
    for (const w of l.vocab) {
      assert.ok(w.tl && w.en && w.say, `${l.id} vocab item complete: ${JSON.stringify(w)}`);
    }

    // tip
    assert.ok(l.tip && l.tip.title && l.tip.body, `${l.id} has a tip`);

    // sentences
    assert.ok(Array.isArray(l.sentences) && l.sentences.length >= 1, `${l.id} has sentences`);
    for (const s of l.sentences) assert.ok(s.tl && s.en, `${l.id} sentence complete`);

    // reading
    const r = l.reading;
    assert.ok(r && r.passage && r.en && r.q, `${l.id} reading complete`);
    assert.ok(Array.isArray(r.options) && r.options.includes(r.answer), `${l.id} reading answer in options`);

    // quiz
    const q = l.quiz;
    assert.ok(q && q.q && q.answer, `${l.id} quiz complete`);
    assert.ok(["mc", "text"].includes(q.type), `${l.id} quiz type valid`);
    if (q.type === "mc") {
      assert.ok(q.options.length >= 2, `${l.id} mc has options`);
      assert.ok(q.options.includes(q.answer), `${l.id} mc answer in options`);
    }
  }
});

test("allLessons attaches unit metadata", () => {
  for (const l of allLessons()) {
    assert.ok(l.unitId && l.unitTitle && l.unitColor, `${l.id} has unit metadata`);
  }
});

test("lessonById / unitById resolve and reject unknowns", () => {
  assert.equal(lessonById("u1l1").title, "Essential Greetings");
  assert.equal(unitById("u3").id, "u3");
  assert.equal(lessonById("nope"), null);
  assert.equal(unitById("nope"), null);
});
