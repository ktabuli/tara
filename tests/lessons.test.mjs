import "./helpers/setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { allLessons } from "../assets/js/curriculum.js";
import {
  lessonParts, allParts, partById, buildSteps, practiceSteps,
  checkAnswer, audioSlug, shuffle
} from "../assets/js/lessons.js";

const POOL = allLessons().flatMap((l) => l.vocab);

test("lessonParts splits vocab into bite-sized parts of <=3", () => {
  const l = allLessons().find((x) => x.id === "u1l1"); // 6 words
  const parts = lessonParts(l);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts.map((p) => p.id), ["u1l1p1", "u1l1p2"]);
  for (const p of parts) {
    assert.ok(p.words.length <= 3 && p.words.length >= 1);
    assert.equal(p.partCount, 2);
  }
  // tip only on first part; quiz & reading only on last part
  assert.ok(parts[0].tip && !parts[1].tip);
  assert.ok(parts[1].quiz && parts[1].reading);
  assert.ok(!parts[0].quiz && !parts[0].reading);
  // part 2 recaps part 1's words
  assert.equal(parts[1].recapWords.length, parts[0].words.length);
});

test("allParts: 24 parts, unique ordered ids, first has no recap", () => {
  const parts = allParts();
  assert.equal(parts.length, 24);
  assert.equal(new Set(parts.map((p) => p.id)).size, 24);
  assert.equal(parts[0].recapWords.length, 0); // very first part of the course
  for (const p of parts) assert.ok(p.unitId && p.unitTitle, `${p.id} has unit info`);
});

test("partById resolves and rejects unknowns", () => {
  assert.equal(partById("u1l1p1").id, "u1l1p1");
  assert.equal(partById("nope"), null);
});

test("buildSteps produces a valid interleaved sequence (invariants over many runs)", () => {
  for (const p of allParts()) {
    for (let run = 0; run < 15; run++) {
      const steps = buildSteps(p, POOL);
      assert.ok(steps.length > 0, `${p.id} has steps`);

      const teachCount = steps.filter((s) => s.type === "teach").length;
      assert.equal(teachCount, p.words.length, `${p.id} teaches each word once`);

      // tip appears only when the part has a tip, and is first
      if (p.tip) assert.equal(steps[0].type, "tip", `${p.id} tip first`);
      assert.equal(steps.filter((s) => s.type === "tip").length, p.tip ? 1 : 0);

      // quiz only on parts that have one, and it's the last step
      if (p.quiz) assert.equal(steps[steps.length - 1].type, "quiz", `${p.id} quiz last`);
      assert.equal(steps.filter((s) => s.type === "quiz").length, p.quiz ? 1 : 0);

      // reading only on parts that have one
      assert.equal(steps.filter((s) => s.type === "reading").length, p.reading ? 1 : 0);

      // at least one scored step
      const scored = steps.filter((s) => s.type !== "teach" && s.type !== "tip");
      assert.ok(scored.length >= 1, `${p.id} has scored steps`);

      for (const s of steps) {
        if (s.type === "choose" || s.type === "listen") {
          assert.equal(s.options.length, 4, `${p.id} ${s.type} has 4 options`);
          assert.ok(s.options.includes(s.answer), `${p.id} ${s.type} answer in options`);
        }
        if (s.type === "cloze") {
          assert.ok(s.options.includes(s.answer), `${p.id} cloze answer in options`);
          assert.ok(s.display.includes("_____"), `${p.id} cloze has a blank`);
        }
        if (s.type === "reading") {
          assert.ok(s.options.includes(s.answer), `${p.id} reading answer in options`);
        }
        if (s.type === "build") {
          assert.equal(s.tokens.slice().sort().join(" "), s.answer.split(" ").sort().join(" "),
            `${p.id} build tokens match answer`);
        }
        if (s.type === "match") {
          assert.ok(s.pairs.length >= 2, `${p.id} match has pairs`);
        }
      }
    }
  }
});

test("practiceSteps drills the given words (one game each + a match)", () => {
  const words = allLessons()[0].vocab.slice(0, 4);
  const steps = practiceSteps(words, POOL);
  assert.equal(steps.length, words.length + 1); // +1 match
  assert.equal(steps.filter((s) => s.type === "match").length, 1);
  assert.equal(steps.filter((s) => s.type === "teach").length, 0); // no teaching in practice

  // a single word: no match step
  assert.equal(practiceSteps(words.slice(0, 1), POOL).length, 1);
});

test("checkAnswer is lenient about case and punctuation", () => {
  assert.equal(checkAnswer({ type: "choose", answer: "Thank you" }, "thank you"), true);
  assert.equal(checkAnswer({ type: "write", answer: "Salamat po!" }, "salamat po"), true);
  assert.equal(checkAnswer({ type: "cloze", answer: "umaga" }, "Umaga"), true);
  assert.equal(checkAnswer({ type: "build", answer: "Ako si Ben" }, "ako si ben"), true);
  assert.equal(checkAnswer({ type: "choose", answer: "Oo" }, "Hindi"), false);
});

test("checkAnswer (speak) accepts close/overlapping transcripts", () => {
  assert.equal(checkAnswer({ type: "speak", answer: "Magandang umaga" }, "magandang umaga po"), true);
  assert.equal(checkAnswer({ type: "speak", answer: "Salamat" }, "salamat"), true);
  assert.equal(checkAnswer({ type: "speak", answer: "Magandang umaga" }, ""), false);
  assert.equal(checkAnswer({ type: "speak", answer: "Magandang umaga" }, "kumusta"), false);
});

test("audioSlug builds safe filenames", () => {
  assert.equal(audioSlug("Magandang umaga"), "magandang-umaga");
  assert.equal(audioSlug("Saan ang banyo?"), "saan-ang-banyo");
  assert.equal(audioSlug("Salamat po"), "salamat-po");
  assert.equal(audioSlug("búhat"), "buhat");
});

test("shuffle keeps the same elements", () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffle(a);
  assert.equal(b.length, a.length);
  assert.deepEqual(b.slice().sort(), a.slice().sort());
  assert.deepEqual(a, [1, 2, 3, 4, 5]); // original not mutated
});
