/* =====================================================================
 * lessons.js — Exercise generation + speech (TTS & recognition)
 * ---------------------------------------------------------------------
 * Turns a lesson's vocab list into a varied sequence of exercises that
 * cover reading, writing, listening and speaking, Duolingo-style.
 * ===================================================================== */

import { store } from "./store.js";

/* ---------- small utilities ---------- */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const sample = (arr, n) => shuffle(arr).slice(0, n);
const norm = (s) => s.toLowerCase().trim().replace(/[.,!?¡¿'"]/g, "").replace(/\s+/g, " ");

/* ---------- distractor pool from across the course ---------- */
function distractors(vocab, correct, key, pool, n = 3) {
  const others = pool.filter((v) => v[key] !== correct[key]);
  return sample(others, n).map((v) => v[key]);
}

/* =====================================================================
 * Build the exercise sequence for a lesson.
 * The mix is weighted by the lesson's skill tag.
 * ===================================================================== */
export function buildExercises(lesson, coursePool) {
  const v = lesson.vocab;
  const skill = lesson.skill;
  const ex = [];

  v.forEach((word) => {
    // Choose exercise type per word, biased by lesson skill
    const r = Math.random();
    let type;
    if (skill === "speaking") {
      type = r < 0.7 ? "speak" : "listen";
    } else if (skill === "listening") {
      type = r < 0.7 ? "listen" : "choose_tl";
    } else if (skill === "writing") {
      type = r < 0.55 ? "write" : r < 0.8 ? "choose_en" : "listen";
    } else { // reading
      type = r < 0.45 ? "choose_en" : r < 0.75 ? "choose_tl" : r < 0.9 ? "listen" : "write";
    }
    ex.push(makeExercise(type, word, coursePool));
  });

  // Always add one "match pairs" exercise if the lesson has enough words
  if (v.length >= 4) {
    ex.push({ type: "match", pairs: sample(v, Math.min(4, v.length)) });
  }

  const out = shuffle(ex);

  // The lesson's quiz question always comes last, as a culminating check.
  if (lesson.quiz) {
    out.push({ type: "quiz", quiz: lesson.quiz });
  }

  return out;
}

function makeExercise(type, word, pool) {
  switch (type) {
    case "choose_en": // see Tagalog, pick English
      return {
        type: "choose",
        prompt: `What does this mean?`,
        word,
        question: word.tl,
        speakable: word.tl,
        answer: word.en,
        options: shuffle([word.en, ...distractors(null, word, "en", pool)])
      };
    case "choose_tl": // see English, pick Tagalog
      return {
        type: "choose",
        prompt: `Choose the Tagalog`,
        word,
        question: word.en,
        answer: word.tl,
        options: shuffle([word.tl, ...distractors(null, word, "tl", pool)])
      };
    case "listen": // hear Tagalog, pick English
      return {
        type: "listen",
        prompt: `Tap what you hear, then choose its meaning`,
        word,
        speakable: word.tl,
        answer: word.en,
        options: shuffle([word.en, ...distractors(null, word, "en", pool)])
      };
    case "write": // see English, type Tagalog
      return {
        type: "write",
        prompt: `Type this in Tagalog`,
        word,
        question: word.en,
        answer: word.tl
      };
    case "speak": // see Tagalog, say it
      return {
        type: "speak",
        prompt: `Say this out loud`,
        word,
        question: word.tl,
        hint: word.say,
        speakable: word.tl,
        answer: word.tl
      };
    default:
      return makeExercise("choose_en", word, pool);
  }
}

/* =====================================================================
 * Answer checking
 * ===================================================================== */
export function checkAnswer(ex, given) {
  if (ex.type === "choose" || ex.type === "listen") {
    return norm(given) === norm(ex.answer);
  }
  if (ex.type === "write") {
    return norm(given) === norm(ex.answer);
  }
  if (ex.type === "speak") {
    // Lenient: accept if the heard text contains the target or vice-versa
    const a = norm(ex.answer), g = norm(given);
    if (!g) return false;
    if (g === a) return true;
    if (a.includes(g) || g.includes(a)) return true;
    // token overlap (handles ASR dropping small words)
    const at = a.split(" "), gt = new Set(g.split(" "));
    const hit = at.filter((t) => gt.has(t)).length;
    return hit / at.length >= 0.6;
  }
  return false;
}

/* =====================================================================
 * Text-to-Speech — speaks Tagalog using the Web Speech API.
 * Falls back gracefully if no Filipino voice is installed.
 * ===================================================================== */
let _voices = [];
function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  _voices = window.speechSynthesis.getVoices();
}
if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickVoice() {
  if (!_voices.length) loadVoices();
  // Prefer Filipino, then any voice
  return (
    _voices.find((v) => /fil|tl|tagalog|filipino|ph/i.test(v.lang + v.name)) ||
    _voices.find((v) => /en/i.test(v.lang)) ||
    _voices[0] ||
    null
  );
}

export function canSpeak() { return "speechSynthesis" in window; }

export function speak(text) {
  if (!canSpeak() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice && /fil|tl|ph/i.test(voice.lang) ? voice.lang : "fil-PH";
    u.rate = store.state.settings.ttsRate || 0.85;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}

/* =====================================================================
 * Speech Recognition — listens for the learner saying a Tagalog phrase.
 * Returns a Promise that resolves with the recognized transcript.
 * ===================================================================== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export function canListen() { return !!SR; }

export function listen({ onStart, onEnd } = {}) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error("no-speech-recognition"));
    const rec = new SR();
    rec.lang = "fil-PH";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
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

    // safety stop
    setTimeout(() => { try { rec.stop(); } catch (e) {} }, 7000);
  });
}
