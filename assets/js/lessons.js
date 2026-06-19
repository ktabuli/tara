/* =====================================================================
 * lessons.js — Bite-sized parts, interleaved step builder, speech
 * ---------------------------------------------------------------------
 * A lesson is split into small "parts" (~3 words each). Each part is a
 * node on the path and plays as an interleaved sequence of steps:
 *   tip → recap → (flashcard → game) × words → fill-blank → build
 *       → match → reading → recap review → quiz
 * Teaching steps (tip / flashcard) are not scored; games are.
 * ===================================================================== */

import { store } from "./store.js";
import { allLessons } from "./curriculum.js";

/* ---------- utilities ---------- */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const sample = (arr, n) => shuffle(arr).slice(0, n);
const norm = (s) => String(s).toLowerCase().trim().replace(/[.,!?¡¿'"]/g, "").replace(/\s+/g, " ");
const STOP = new Set(["ang", "ng", "sa", "na", "po", "ko", "ka", "si", "ay", "at", "rin", "din", "lang", "mo", "ako", "kita", "ito", "kong"]);

/* ---------- distractors from across the course ---------- */
function distractors(correct, key, pool, n = 3) {
  const others = pool.filter((v) => v[key] !== correct[key]);
  return sample(others, n).map((v) => v[key]);
}

/* =====================================================================
 * Split lessons into bite-sized parts
 * ===================================================================== */
export function lessonParts(lesson) {
  const chunks = [];
  for (let i = 0; i < lesson.vocab.length; i += 3) chunks.push(lesson.vocab.slice(i, i + 3));
  const n = chunks.length || 1;
  return chunks.map((words, idx) => ({
    id: `${lesson.id}p${idx + 1}`,
    lessonId: lesson.id,
    title: lesson.title,
    part: idx + 1,
    partCount: n,
    skill: lesson.skill,
    words,
    recapWords: chunks.slice(0, idx).flat(),   // earlier words in this lesson
    tip: idx === 0 ? lesson.tip : null,
    sentences: lesson.sentences || [],
    reading: idx === n - 1 ? lesson.reading : null,
    quiz: idx === n - 1 ? lesson.quiz : null
  }));
}

/* All parts across the whole course, in order, with unit info + a
 * cross-lesson recap pool (so a new lesson opens by reviewing prior words). */
export function allParts() {
  const out = [];
  let learned = [];
  for (const l of allLessons()) {
    for (const p of lessonParts(l)) {
      const crossRecap = learned.slice(-8);
      out.push({
        ...p,
        unitId: l.unitId, unitTitle: l.unitTitle, unitColor: l.unitColor, unitIcon: l.unitIcon,
        recapWords: p.recapWords.length ? p.recapWords : crossRecap
      });
      learned = learned.concat(p.words);
    }
  }
  return out;
}
export function partById(id) { return allParts().find((p) => p.id === id) || null; }

/* =====================================================================
 * Exercise makers
 * ===================================================================== */
function makeExercise(type, word, pool) {
  switch (type) {
    case "choose_en":
      return { type: "choose", prompt: "What does this mean?", word, question: word.tl, speakable: word.tl,
        answer: word.en, options: shuffle([word.en, ...distractors(word, "en", pool)]) };
    case "choose_tl":
      return { type: "choose", prompt: "Choose the Tagalog", word, question: word.en,
        answer: word.tl, options: shuffle([word.tl, ...distractors(word, "tl", pool)]) };
    case "listen":
      return { type: "listen", prompt: "Tap to listen, then choose its meaning", word, speakable: word.tl,
        answer: word.en, options: shuffle([word.en, ...distractors(word, "en", pool)]) };
    case "write":
      return { type: "write", prompt: "Type this in Tagalog", word, question: word.en, answer: word.tl };
    case "speak":
      return { type: "speak", prompt: "Say this out loud", word, question: word.tl, hint: word.say,
        speakable: word.tl, answer: word.tl };
    default:
      return makeExercise("choose_en", word, pool);
  }
}

/* Fill-in-the-blank from an example sentence */
function makeCloze(sentence, wordPool) {
  const tokens = sentence.tl.split(" ");
  const cand = tokens.map((t, i) => ({ t, i }))
    .filter((o) => o.t.replace(/[?!.,]/g, "").length > 2 && !STOP.has(o.t.toLowerCase().replace(/[?!.,]/g, "")));
  const pick = (cand.length ? cand : tokens.map((t, i) => ({ t, i })))[Math.floor(Math.random() * (cand.length || tokens.length))];
  const answer = pick.t.replace(/[?!.,]/g, "");
  const display = tokens.map((t, i) => (i === pick.i ? "_____" : t)).join(" ");
  const distract = sample(wordPool.filter((w) => norm(w) !== norm(answer)), 3);
  return { type: "cloze", prompt: "Fill in the blank", display, en: sentence.en,
    answer, options: shuffle([answer, ...distract]) };
}

/* Tap-to-build a sentence (drag-and-drop equivalent) */
function makeBuild(sentence) {
  const tokens = sentence.tl.split(" ");
  return { type: "build", prompt: "Tap the words in order", en: sentence.en,
    tokens: shuffle(tokens.slice()), answer: tokens.join(" ") };
}

/* =====================================================================
 * Build the interleaved step sequence for a part
 * ===================================================================== */
export function buildSteps(part, coursePool) {
  const steps = [];
  const words = part.words;

  // word pool for cloze distractors: single content words from the course + sentences
  const wordPool = [];
  coursePool.forEach((v) => v.tl.split(" ").forEach((t) => {
    const c = t.replace(/[?!.,]/g, "");
    if (c.length > 2 && !STOP.has(c.toLowerCase())) wordPool.push(c);
  }));
  (part.sentences || []).forEach((s) => s.tl.split(" ").forEach((t) => {
    const c = t.replace(/[?!.,]/g, "");
    if (c.length > 2 && !STOP.has(c.toLowerCase())) wordPool.push(c);
  }));

  // 1. culture/grammar tip (first part of a lesson)
  if (part.tip) steps.push({ type: "tip", tip: part.tip });

  // 2. recap a previously-learned word
  if (part.recapWords && part.recapWords.length) {
    steps.push({ ...makeExercise("choose_en", sample(part.recapWords, 1)[0], coursePool), isRecap: true });
  }

  // 3. teach each new word, then a quick game on it
  words.forEach((w, j) => {
    steps.push({ type: "teach", word: w });
    steps.push(makeExercise(j % 2 === 0 ? "choose_en" : "choose_tl", w, coursePool));
    if (j === 0) steps.push(makeExercise("listen", w, coursePool));
  });

  // 4. fill in the blank
  if (part.sentences && part.sentences.length) {
    steps.push(makeCloze(sample(part.sentences, 1)[0], wordPool));
  }

  // 5. build a sentence
  const buildable = (part.sentences || []).filter((s) => {
    const n = s.tl.split(" ").length; return n >= 3 && n <= 6;
  });
  if (buildable.length) steps.push(makeBuild(sample(buildable, 1)[0]));

  // 6. speaking practice (for speaking-skill parts)
  if (part.skill === "speaking") {
    steps.push(makeExercise("speak", sample(words, 1)[0], coursePool));
  }

  // 7. match pairs
  const matchWords = (words.length >= 2 ? words : words.concat(part.recapWords || [])).slice(0, 4);
  if (matchWords.length >= 2) steps.push({ type: "match", pairs: sample(matchWords, Math.min(4, matchWords.length)) });

  // 8. reading comprehension (last part of a lesson)
  if (part.reading) {
    steps.push({ type: "reading", passage: part.reading.passage, en: part.reading.en,
      q: part.reading.q, answer: part.reading.answer, options: shuffle(part.reading.options.slice()) });
  }

  // 9. recap review of this part's words
  sample(words, Math.min(2, words.length)).forEach((w) =>
    steps.push({ ...makeExercise("choose_tl", w, coursePool), isRecap: true }));

  // 10. quiz (last part of a lesson)
  if (part.quiz) steps.push({ type: "quiz", quiz: part.quiz });

  return steps;
}

/* =====================================================================
 * Answer checking
 * ===================================================================== */
export function checkAnswer(ex, given) {
  if (ex.type === "speak") {
    const a = norm(ex.answer), g = norm(given);
    if (!g) return false;
    if (g === a || a.includes(g) || g.includes(a)) return true;
    const at = a.split(" "), gt = new Set(g.split(" "));
    return at.filter((t) => gt.has(t)).length / at.length >= 0.6;
  }
  // choose, listen, write, cloze, reading, build, quiz → normalized equality
  return norm(given) === norm(ex.answer);
}

/* =====================================================================
 * Text-to-Speech (Tagalog) via Web Speech API
 * ===================================================================== */
let _voices = [];
function loadVoices() { if ("speechSynthesis" in window) _voices = window.speechSynthesis.getVoices(); }
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}
function pickVoice() {
  if (!_voices.length) loadVoices();
  return (
    _voices.find((v) => /fil|tl|tagalog|filipino|ph/i.test(v.lang + v.name)) ||
    _voices.find((v) => /en/i.test(v.lang)) || _voices[0] || null
  );
}
export function canSpeak() { return typeof window !== "undefined" && "speechSynthesis" in window; }
export function speak(text) {
  if (!canSpeak() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice && /fil|tl|ph/i.test(voice.lang) ? voice.lang : "fil-PH";
    u.rate = store.state.settings.ttsRate || 0.85;
    window.speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}

/* =====================================================================
 * Speech Recognition (listen for spoken Tagalog)
 * ===================================================================== */
const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export function canListen() { return !!SR; }
export function listen({ onStart, onEnd } = {}) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error("no-speech-recognition"));
    const rec = new SR();
    rec.lang = "fil-PH"; rec.interimResults = false; rec.maxAlternatives = 3;
    let done = false;
    rec.onstart = () => onStart && onStart();
    rec.onerror = (e) => { if (!done) { done = true; onEnd && onEnd(); reject(new Error(e.error || "speech-error")); } };
    rec.onend = () => { onEnd && onEnd(); if (!done) { done = true; resolve(""); } };
    rec.onresult = (e) => {
      done = true;
      const alts = [];
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
      resolve(alts.join(" | "));
    };
    try { rec.start(); } catch (err) { reject(err); }
    setTimeout(() => { try { rec.stop(); } catch (e) {} }, 7000);
  });
}
