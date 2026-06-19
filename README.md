# Tara! — Learn Tagalog 🇵🇭

A gamified, **mobile-first** app that teaches **Tagalog / Filipino** to English (Canadian) speakers — built as an installable Progressive Web App (PWA) and deployed on GitHub Pages.

> **Tara!** is Tagalog for *"Let's go!"*

🔗 **Live:** https://ktabuli.github.io/

## Features

Built around the project's overview notes:

| # | Goal | How it's delivered |
|---|------|--------------------|
| 1 | **Gamified (like Duolingo)** | XP, levels, gems, hearts/lives, a learning path with unlockable lessons, stars per lesson, and celebratory finish screens |
| 2 | **Reading, writing, speech / conversation** | Five exercise types: multiple-choice (reading), type-the-translation (writing), listen-and-choose & speak-aloud (speech via the Web Speech API), and match-the-pairs |
| 3 | **Progress tracker / dashboard** | A **Stats** screen with KPIs, a 7-day activity chart, per-unit completion bars, and a skills breakdown |
| 4 | **Mobile use** | Mobile-first responsive design, installable to the home screen, works offline, big touch targets, bottom tab bar |
| 5 | **Review history / check off lessons** | A **History** screen listing every lesson with completion check-marks, stars and dates, plus a recent-activity log; replay any lesson anytime |
| 6 | **Daily streak** | Daily XP goal that drives a streak counter (with best-streak tracking and a graceful break if a day is missed) |
| 7 | **Reward system** | 9 unlockable achievement badges and a gem shop (spend gems to refill hearts) |

## Tech

- **No build step.** Plain HTML, CSS and ES-module JavaScript — deploys straight to GitHub Pages.
- **Offline-first PWA** via a service worker + web manifest.
- **Persistent progress** in `localStorage` (XP, streaks, hearts, history, achievements, settings).
- **Speech** uses the browser's built-in `SpeechSynthesis` (text-to-speech) and `SpeechRecognition` (voice input). Both degrade gracefully when a browser lacks them (e.g. self-mark a speaking exercise).

## Project structure

```
index.html               App shell
manifest.webmanifest      PWA manifest (installable)
service-worker.js         Offline caching
assets/
  css/style.css           Mobile-first styles
  img/icon.svg            App icon (Philippine sun)
  js/
    curriculum.js         Course content (units → lessons → vocab)
    store.js              Persistent state: XP, streak, hearts, achievements
    lessons.js            Exercise generation + speech (TTS / recognition)
    app.js                UI, navigation, lesson player
```

## Adding content

Open `assets/js/curriculum.js` and add vocab to a lesson — exercises are generated automatically:

```js
{ tl: "Salamat", en: "Thank you", say: "sa-LA-mat", emoji: "🙏" }
//  Tagalog        English          pronunciation     (optional)
```

## Run locally

It's static, but ES modules and the service worker need to be served over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

> 💡 Speech recognition (the microphone exercises) works best in Chrome/Edge and requires a secure context (`https://` or `localhost`).

## Curriculum at a glance

1. **Greetings** — hello, goodbye, times of day, polite words
2. **Getting Acquainted** — introductions, "nice to meet you", first conversation
3. **Numbers** — 1–10
4. **Family** — parents, siblings, the whole family
5. **Food & Drink** — meals, snacks, ordering
6. **Out & About** — useful questions, getting help, heartfelt phrases
