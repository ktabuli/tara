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

/* Short glosses for common Tagalog function/helper words, shown as a
 * footnote on sentence exercises so learners aren't stumped by particles
 * (e.g. "naman", "po") that aren't part of the vocabulary being taught. */
const PARTICLE_GLOSS = {
  po: "politeness marker", opo: "respectful “yes”",
  naman: "softener — a gentle “well / though”",
  rin: "too / also (after a vowel)", din: "too / also (after a consonant)",
  na: "now / already", lang: "just / only", ba: "makes it a yes/no question",
  ang: "“the” (subject marker)", ng: "of / object marker", sa: "to / at / in",
  ay: "linker (formal word order)", ako: "I / me", ka: "you", mo: "your / you",
  ko: "my / I", si: "name marker (before a person)", kita: "I … you",
  tayo: "we / let’s", ito: "this", kong: "that I", pero: "but",
  kasi: "because", tapos: "then"
};

/* Helper words present in a phrase, with their gloss (deduped, in order). */
export function helperNotes(text) {
  const seen = new Set();
  const out = [];
  for (const tok of String(text).split(/\s+/)) {
    const w = tok.toLowerCase().replace(/[^a-zñ]/gi, "");
    if (PARTICLE_GLOSS[w] && !seen.has(w)) { seen.add(w); out.push({ w, gloss: PARTICLE_GLOSS[w] }); }
  }
  return out;
}

/* The full helper-word glossary, alphabetised (for the Review reference). */
export function helperGlossary() {
  return Object.entries(PARTICLE_GLOSS).map(([w, gloss]) => ({ w, gloss })).sort((a, b) => a.w.localeCompare(b.w));
}

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
  let learned = [];          // ordered list of words seen before the current part
  const known = [];          // unique vocab introduced up to & including each part
  const seen = new Set();
  for (const l of allLessons()) {
    for (const p of lessonParts(l)) {
      const crossRecap = learned.slice(-8);
      for (const w of p.words) if (!seen.has(w.tl)) { seen.add(w.tl); known.push(w); }
      out.push({
        ...p,
        unitId: l.unitId, unitTitle: l.unitTitle, unitColor: l.unitColor, unitIcon: l.unitIcon,
        recapWords: p.recapWords.length ? p.recapWords : crossRecap,
        known: known.slice()   // only words the learner has been introduced to by now
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

/* Fill-in-the-blank — blanks a word the learner has actually been taught,
 * with distractors drawn only from known words. Returns null if the sentence
 * contains no known single word to blank (so we never quiz untaught content). */
function makeCloze(sentence, known) {
  // single-word known vocab, with surface punctuation stripped (e.g. "Talaga?" -> "Talaga")
  const singles = known.filter((w) => !/\s/.test(w.tl)).map((w) => w.tl.replace(/[?!.,]/g, ""));
  if (singles.length < 2) return null;
  const knownSet = new Set(singles.map(norm));
  const tokens = sentence.tl.split(" ");
  const cand = tokens.map((t, i) => ({ c: t.replace(/[?!.,]/g, ""), i })).filter((o) => knownSet.has(norm(o.c)));
  if (!cand.length) return null;
  const pick = cand[Math.floor(Math.random() * cand.length)];
  const answer = pick.c;
  const display = tokens.map((t, i) => (i === pick.i ? "_____" : t)).join(" ");
  // match every option to the answer's leading case so the correct one isn't a visual giveaway
  const setCase = (w) => (/^[A-Z]/.test(answer) ? w.charAt(0).toUpperCase() + w.slice(1) : w.charAt(0).toLowerCase() + w.slice(1));
  const distract = sample(singles.filter((w) => norm(w) !== norm(answer)), 3).map(setCase);
  if (!distract.length) return null;
  return { type: "cloze", prompt: "Fill in the blank", display, en: sentence.en,
    answer: setCase(answer), options: shuffle([setCase(answer), ...distract]), notes: helperNotes(sentence.tl) };
}

/* Tap-to-build a sentence (drag-and-drop equivalent) */
function makeBuild(sentence) {
  const tokens = sentence.tl.split(" ");
  return { type: "build", prompt: "Tap the words in order", en: sentence.en,
    tokens: shuffle(tokens.slice()), answer: tokens.join(" "), notes: helperNotes(sentence.tl) };
}

/* =====================================================================
 * Build the interleaved step sequence for a part
 * ===================================================================== */
export function buildSteps(part, coursePool) {
  const steps = [];
  const words = part.words;
  // Only ever quiz with words the learner has been introduced to.
  const pool = part.known && part.known.length ? part.known : coursePool;

  // 1. culture/grammar tip (first part of a lesson)
  if (part.tip) steps.push({ type: "tip", tip: part.tip });

  // 2. recap a previously-learned word
  if (part.recapWords && part.recapWords.length) {
    steps.push({ ...makeExercise("choose_en", sample(part.recapWords, 1)[0], pool), isRecap: true });
  }

  // 3. teach each new word, then a randomized game on it (varies every run,
  //    but always covers the same words). Game types are skill-appropriate.
  const gameTypes = part.skill === "writing" ? ["choose_en", "choose_tl", "write"]
    : part.skill === "listening" ? ["listen", "choose_en", "choose_tl"]
    : ["choose_en", "choose_tl", "listen"];
  words.forEach((w) => {
    steps.push({ type: "teach", word: w });
    steps.push(makeExercise(sample(gameTypes, 1)[0], w, pool));
    if (Math.random() < 0.45) steps.push(makeExercise(sample(gameTypes, 1)[0], w, pool));
  });

  // 4. fill in the blank (skip any sentence with no known word to blank)
  for (const sentence of shuffle(part.sentences || [])) {
    const cz = makeCloze(sentence, pool);
    if (cz) { steps.push(cz); break; }
  }

  // 5. build a sentence
  const buildable = (part.sentences || []).filter((s) => {
    const n = s.tl.split(" ").length; return n >= 3 && n <= 6;
  });
  if (buildable.length) steps.push(makeBuild(sample(buildable, 1)[0]));

  // 6. speaking practice (for speaking-skill parts)
  if (part.skill === "speaking") {
    steps.push(makeExercise("speak", sample(words, 1)[0], pool));
  }

  // 7. match pairs
  const matchWords = (words.length >= 2 ? words : words.concat(part.recapWords || [])).slice(0, 4);
  if (matchWords.length >= 2) steps.push({ type: "match", pairs: sample(matchWords, Math.min(4, matchWords.length)) });

  // 8. reading comprehension (last part of a lesson)
  if (part.reading) {
    steps.push({ type: "reading", passage: part.reading.passage, en: part.reading.en,
      q: part.reading.q, answer: part.reading.answer, options: shuffle(part.reading.options.slice()),
      notes: helperNotes(part.reading.passage) });
  }

  // 9. recap review of this part's words
  sample(words, Math.min(2, words.length)).forEach((w) =>
    steps.push({ ...makeExercise("choose_tl", w, pool), isRecap: true }));

  // 10. quiz (last part of a lesson)
  if (part.quiz) steps.push({ type: "quiz", quiz: part.quiz });

  return steps;
}

/* =====================================================================
 * Practice session (Review hub) — a fresh mixed drill from a word set.
 * No teaching steps, no lesson completion; pure review.
 * ===================================================================== */
export function practiceSteps(words, coursePool) {
  const types = ["choose_en", "choose_tl", "listen", "write"];
  const steps = words.map((w, i) => makeExercise(types[i % types.length], w, coursePool));
  if (words.length >= 2) {
    steps.push({ type: "match", pairs: sample(words, Math.min(4, words.length)) });
  }
  return shuffle(steps);
}

/* =====================================================================
 * Unit test (final assessment) — covers every lesson in the unit.
 * No teaching steps; a mix of vocab questions, the lessons' quizzes,
 * and one reading. `unit` is a COURSE unit (has .lessons).
 * ===================================================================== */
export function unitTestSteps(unit, coursePool) {
  const seen = new Set();
  const vocab = [];
  unit.lessons.forEach((l) => l.vocab.forEach((w) => { if (!seen.has(w.tl)) { seen.add(w.tl); vocab.push(w); } }));

  const types = ["choose_en", "choose_tl", "listen", "write"];
  const steps = vocab.map((w, i) => makeExercise(types[i % types.length], w, coursePool));

  unit.lessons.forEach((l) => { if (l.quiz) steps.push({ type: "quiz", quiz: l.quiz }); });

  const withReading = unit.lessons.find((l) => l.reading);
  if (withReading) {
    const r = withReading.reading;
    steps.push({ type: "reading", passage: r.passage, en: r.en, q: r.q, answer: r.answer,
      options: shuffle(r.options.slice()), notes: helperNotes(r.passage) });
  }
  return shuffle(steps);
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

/* Speak with the browser's text-to-speech voice. */
function ttsSpeak(text) {
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

/* Turn a Tagalog phrase into an audio filename slug, e.g.
 * "Magandang umaga" -> "magandang-umaga", "Saan ang banyo?" -> "saan-ang-banyo" */
export function audioSlug(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const _audioMissing = new Set(); // slugs with no recorded file (don't retry)

/* Play recorded human audio if available (assets/audio/<slug>.mp3),
 * otherwise fall back to the browser's text-to-speech. */
export function speak(text) {
  if (!text) return;
  const slug = audioSlug(text);
  if (slug && typeof Audio !== "undefined" && !_audioMissing.has(slug)) {
    let fellBack = false;
    const fallback = () => { if (fellBack) return; fellBack = true; _audioMissing.add(slug); ttsSpeak(text); };
    try {
      if (canSpeak()) window.speechSynthesis.cancel();
      const a = new Audio(`assets/audio/${slug}.mp3`);
      a.addEventListener("error", fallback, { once: true });
      const p = a.play();
      if (p && p.catch) p.catch(fallback);
      return;
    } catch (e) { ttsSpeak(text); return; }
  }
  ttsSpeak(text);
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
