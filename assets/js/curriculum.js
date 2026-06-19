/* =====================================================================
 * curriculum.js — Tagalog/Filipino course for English (Canadian) speakers
 * ---------------------------------------------------------------------
 * Built from the 6-Unit Instructional Learning Plan. Each lesson has:
 *   vocab : the words taught (plan words + a few related ones)
 *   tip   : a short culture/grammar note shown before practice
 *   quiz  : the lesson's quiz question (mc = multiple choice, text = typed)
 *   skill : reading | writing | speaking | listening (weights the games)
 *
 * vocab item: { tl, en, say, emoji? }
 *   tl  = Tagalog/Filipino   en = English meaning
 *   say = pronunciation guide (CAPS = stressed syllable)
 *
 * Everything in the app is generated from this file — it's the single
 * source of truth for all words, tips and quizzes.
 * ===================================================================== */

export const COURSE = {
  language: "Tagalog / Filipino",
  from: "English (Canada)",
  units: [
    {
      id: "u1",
      title: "Courtesy & Sentences",
      subtitle: "Paggalang at Pangungusap",
      color: "#1f9d8f",
      icon: "🙏",
      lessons: [
        {
          id: "u1l1",
          title: "Essential Greetings",
          skill: "reading",
          vocab: [
            { tl: "Kumusta", en: "How are you? / Hello", say: "ku-mus-TA", emoji: "👋" },
            { tl: "Magandang umaga", en: "Good morning", say: "ma-gan-DANG u-MA-ga", emoji: "🌅" },
            { tl: "Mabuti", en: "Fine / Good / Well", say: "ma-BU-ti", emoji: "😊" },
            { tl: "Magandang hapon", en: "Good afternoon", say: "ma-gan-DANG HA-pon", emoji: "🌤️" },
            { tl: "Magandang gabi", en: "Good evening", say: "ma-gan-DANG ga-BI", emoji: "🌙" },
            { tl: "Opo", en: "Yes (respectful)", say: "O-po", emoji: "🙇" }
          ],
          tip: {
            title: "Po & Opo — the “little bow”",
            body: "Respect is the cornerstone of Filipino culture. Add po inside sentences to be polite (e.g. Salamat po = Thank you, politely), and use opo as a respectful “yes” to elders or strangers. It's like adding a little bow to your words."
          },
          quiz: {
            type: "mc",
            q: 'Which is the correct polite response to the greeting "Kumusta?"',
            options: ["Salamat", "Mabuti po", "Paalam"],
            answer: "Mabuti po",
            explain: "Mabuti means “fine,” and po adds respect."
          }
        },
        {
          id: "u1l2",
          title: "Mechanics of the Sentence",
          skill: "writing",
          vocab: [
            { tl: "Ako si", en: "I am (name)", say: "a-KO si", emoji: "🙋" },
            { tl: "Salamat", en: "Thank you", say: "sa-LA-mat", emoji: "🙏" },
            { tl: "Paalam", en: "Goodbye", say: "pa-A-lam", emoji: "👋" },
            { tl: "Oo", en: "Yes", say: "O-o", emoji: "✅" },
            { tl: "Hindi", en: "No", say: "hin-DI", emoji: "❌" },
            { tl: "Salamat po", en: "Thank you (polite)", say: "sa-LA-mat po", emoji: "🙏" }
          ],
          tip: {
            title: "Verb first: the V-S-O pattern",
            body: 'Tagalog usually leads with the verb (Verb-Subject-Object), unlike English (S-V-O). "Nag-aaral si Maria" (Studies Maria) means "Maria is studying." You can use the word "ay" for an English-like order (Si Maria ay nag-aaral), but that\'s mostly for formal writing.'
          },
          quiz: {
            type: "mc",
            q: 'Arrange into natural Tagalog (V-S-O): the words "si Juan" and "Kumain" (ate). Which is correct?',
            options: ["Kumain si Juan", "Si Juan kumain", "Juan kumain si"],
            answer: "Kumain si Juan",
            explain: "The verb (Kumain) comes first in everyday speech."
          }
        }
      ]
    },

    {
      id: "u2",
      title: "Social Interactions",
      subtitle: "Pakikisalamuha",
      color: "#e0883b",
      icon: "🤝",
      lessons: [
        {
          id: "u2l1",
          title: "Getting to Know Others",
          skill: "reading",
          vocab: [
            { tl: "Ano ang pangalan mo?", en: "What is your name?", say: "a-NO ang pa-NGA-lan mo", emoji: "❓" },
            { tl: "Tagasaan ka?", en: "Where are you from?", say: "ta-ga-sa-AN ka", emoji: "🌍" },
            { tl: "Ilang taon ka na?", en: "How old are you?", say: "i-LANG TA-on ka na", emoji: "🎂" },
            { tl: "Ikinagagalak kong makilala ka", en: "Nice to meet you", say: "i-ki-na-ga-GA-lak kong ma-ki-LA-la ka", emoji: "🤝" },
            { tl: "Taga-Canada ako", en: "I'm from Canada", say: "ta-ga-Ca-NA-da a-KO", emoji: "🇨🇦" }
          ],
          tip: {
            title: 'The question particle "ba"',
            body: 'Add ba to turn a statement into a yes/no question. It follows the first word or the subject: "Pagod ka" (You are tired) becomes "Pagod ka ba?" (Are you tired?).'
          },
          quiz: {
            type: "mc",
            q: 'To ask "Are you tired?" from "Pagod ka", where does "ba" go?',
            options: ["Pagod ba ka", "Pagod ka ba", "Ba pagod ka"],
            answer: "Pagod ka ba",
            explain: "ba follows the subject (ka): Pagod ka ba?"
          }
        },
        {
          id: "u2l2",
          title: "Pronunciation & Stress",
          skill: "speaking",
          vocab: [
            { tl: "Talaga?", en: "Really?", say: "ta-la-GA", emoji: "😮" },
            { tl: "Oo", en: "Yes", say: "O-o", emoji: "✅" },
            { tl: "Hindi", en: "No", say: "hin-DI", emoji: "❌" },
            { tl: "Ngayon", en: "Now", say: "nga-YON", emoji: "⏱️" },
            { tl: "Sige", en: "Okay / Go ahead", say: "SI-ge", emoji: "👍" }
          ],
          tip: {
            title: "Stress can change the meaning",
            body: 'Tagalog has five vowels (a, e, i, o, u). Where you put the stress can change a word entirely — e.g. búhat (to come from) vs buhát (to carry). Also, "ng" (as in ngayon) is one single nasal sound, not two letters.'
          },
          quiz: {
            type: "mc",
            q: "True or False: shifting the syllable stress in a Tagalog word can change its meaning.",
            options: ["True", "False"],
            answer: "True",
            explain: "Stress is meaningful — it can change the whole definition."
          }
        }
      ]
    },

    {
      id: "u3",
      title: "Streets & Transport",
      subtitle: "Kalye at Sasakyan",
      color: "#3b6fe0",
      icon: "🚍",
      lessons: [
        {
          id: "u3l1",
          title: "Finding Your Way",
          skill: "reading",
          vocab: [
            { tl: "Saan ang banyo?", en: "Where is the bathroom?", say: "sa-AN ang BAN-yo", emoji: "🚻" },
            { tl: "Kanan", en: "Right", say: "KA-nan", emoji: "➡️" },
            { tl: "Kaliwa", en: "Left", say: "ka-li-WA", emoji: "⬅️" },
            { tl: "Diretso", en: "Straight ahead", say: "di-RET-so", emoji: "⬆️" },
            { tl: "Malapit", en: "Near", say: "ma-LA-pit", emoji: "📍" },
            { tl: "Malayo", en: "Far", say: "ma-LA-yo", emoji: "🛣️" }
          ],
          tip: {
            title: "Location words: nasa, malapit, malayo",
            body: 'Use nasa to say where something is (Nasa bahay = is at home). Use malapit for something nearby and malayo for something far away.'
          },
          quiz: {
            type: "text",
            q: 'Translate "Where is the bathroom?" into Tagalog.',
            answer: "Saan ang banyo",
            explain: "Saan ang banyo? = Where is the bathroom?"
          }
        },
        {
          id: "u3l2",
          title: "Riding the Jeepney",
          skill: "speaking",
          vocab: [
            { tl: "Para po!", en: "Stop, please!", say: "PA-ra po", emoji: "✋" },
            { tl: "Bayad po", en: "Here is my payment", say: "BA-yad po", emoji: "💵" },
            { tl: "Magkano ang pamasahe?", en: "How much is the fare?", say: "mag-KA-no ang pa-ma-SA-he", emoji: "🚐" },
            { tl: "Sa tabi lang po", en: "Just by the side, please", say: "sa ta-BI lang po", emoji: "🛑" },
            { tl: "Pasahero", en: "Passenger", say: "pa-sa-HE-ro", emoji: "🧍" }
          ],
          tip: {
            title: "Jeepney phrases",
            body: 'The jeepney is the colourful soul of Philippine transit. Say "Para po!" to tell the driver to pull over so you can get off, and pass your fare forward with "Bayad po." You\'ll also hear a glottal stop — a brief catch in the throat, like the middle of "uh-oh."'
          },
          quiz: {
            type: "mc",
            q: "Which phrase tells a driver to stop so you can get off?",
            options: ["Bayad po", "Para po!", "Magkano po?"],
            answer: "Para po!",
            explain: "Para po! = Stop, please!"
          }
        }
      ]
    },

    {
      id: "u4",
      title: "Dining & Flavors",
      subtitle: "Pagkain at Lasa",
      color: "#d4a017",
      icon: "🍲",
      lessons: [
        {
          id: "u4l1",
          title: "Ordering & Preferences",
          skill: "writing",
          vocab: [
            { tl: "Gutom na ako", en: "I am hungry", say: "gu-TOM na a-KO", emoji: "🤤" },
            { tl: "Uhaw na ako", en: "I am thirsty", say: "U-haw na a-KO", emoji: "🥤" },
            { tl: "Gusto ko ng", en: "I want / I'd like", say: "gus-TO ko nang", emoji: "🙏" },
            { tl: "Tubig", en: "Water", say: "TU-big", emoji: "💧" },
            { tl: "Masarap", en: "Delicious", say: "ma-sa-RAP", emoji: "😋" }
          ],
          tip: {
            title: 'The "ma-" prefix · gutom vs uhaw',
            body: 'Most Tagalog adjectives use the prefix ma- to mean "having that quality" — e.g. masarap (delicious). Be careful to distinguish uhaw (thirst) from gutom (hunger)!'
          },
          quiz: {
            type: "text",
            q: 'Fill in the blank: "Gusto ko ng tubig kasi ____ na ako." (I want water because I am ____.)',
            answer: "uhaw",
            explain: "uhaw = thirsty."
          }
        },
        {
          id: "u4l2",
          title: "Flavors & Cultural Dishes",
          skill: "speaking",
          vocab: [
            { tl: "Masarap!", en: "Delicious!", say: "ma-sa-RAP", emoji: "😋" },
            { tl: "Maanghang", en: "Spicy", say: "ma-ANG-hang", emoji: "🌶️" },
            { tl: "Kain tayo", en: "Let's eat", say: "KA-in TA-yo", emoji: "🍽️" },
            { tl: "Matamis", en: "Sweet", say: "ma-ta-MIS", emoji: "🍬" },
            { tl: "Maalat", en: "Salty", say: "ma-A-lat", emoji: "🧂" }
          ],
          tip: {
            title: '"Kain tayo" & the rin/din rule',
            body: '"Kain tayo" (Let\'s eat) is a warm gesture offered when you\'re eating and someone arrives — a polite "Salamat po" is fine if you\'re not joining. Also: both rin and din mean "too" — use rin after a vowel, din after a consonant.'
          },
          quiz: {
            type: "mc",
            q: 'Do you use "rin" or "din" after "Masaya" (happy) to say "happy too"?',
            options: ["rin", "din"],
            answer: "rin",
            explain: "Masaya ends in a vowel, so use rin."
          }
        }
      ]
    },

    {
      id: "u5",
      title: "Numbers, Time & Shopping",
      subtitle: "Bilang, Oras at Palengke",
      color: "#c0497a",
      icon: "🛒",
      lessons: [
        {
          id: "u5l1",
          title: "Counting & Prices",
          skill: "reading",
          vocab: [
            { tl: "Isa", en: "One", say: "i-SA", emoji: "1️⃣" },
            { tl: "Dalawa", en: "Two", say: "da-la-WA", emoji: "2️⃣" },
            { tl: "Tatlo", en: "Three", say: "tat-LO", emoji: "3️⃣" },
            { tl: "Magkano ito?", en: "How much is this?", say: "mag-KA-no i-TO", emoji: "💰" },
            { tl: "Mahal naman", en: "That's expensive", say: "ma-HAL na-MAN", emoji: "😯" },
            { tl: "Tawad", en: "Discount / haggle", say: "TA-wad", emoji: "🤝" }
          ],
          tip: {
            title: 'Haggling & the word "mahal"',
            body: 'Philippine markets are social hubs — asking for a tawad (discount) is part of the fun! Many number and price words come from Spanish. Fun fact: mahal means both "expensive" and "love."'
          },
          quiz: {
            type: "text",
            q: 'Translate "How much is this?" using the respectful particle po.',
            answer: "Magkano po ito",
            explain: "Magkano po ito? adds po for politeness."
          }
        },
        {
          id: "u5l2",
          title: "Telling Time",
          skill: "writing",
          vocab: [
            { tl: "Anong oras na?", en: "What time is it?", say: "a-NONG O-ras na", emoji: "🕐" },
            { tl: "Umaga", en: "Morning", say: "u-MA-ga", emoji: "🌅" },
            { tl: "Hapon", en: "Afternoon", say: "HA-pon", emoji: "🌤️" },
            { tl: "Gabi", en: "Evening / Night", say: "ga-BI", emoji: "🌙" },
            { tl: "Tanghali", en: "Noon", say: "tang-HA-li", emoji: "☀️" }
          ],
          tip: {
            title: 'The "alas" time system',
            body: 'Filipino timekeeping blends Spanish and Tagalog. Use the Spanish-influenced alas (e.g. alas dos = 2 o\'clock), often adding the Tagalog time of day for clarity: alas dos ng hapon = two in the afternoon.'
          },
          quiz: {
            type: "text",
            q: "How do you say 2:00 PM using the alas system plus a time-of-day marker?",
            answer: "Alas dos ng hapon",
            explain: "alas dos (2 o'clock) + ng hapon (in the afternoon)."
          }
        }
      ]
    },

    {
      id: "u6",
      title: "Connection & Tradition",
      subtitle: "Ugnayan at Tradisyon",
      color: "#7a3bc0",
      icon: "❤️",
      lessons: [
        {
          id: "u6l1",
          title: "Expressions of Care",
          skill: "speaking",
          vocab: [
            { tl: "Mahal kita", en: "I love you", say: "ma-HAL ki-TA", emoji: "❤️" },
            { tl: "Ingat ka", en: "Take care", say: "I-ngat ka", emoji: "🤗" },
            { tl: "Nami-miss kita", en: "I miss you", say: "na-mi-MIS ki-TA", emoji: "🥺" },
            { tl: "Salamat sa lahat", en: "Thanks for everything", say: "sa-LA-mat sa la-HAT", emoji: "🙏" },
            { tl: "Yes po!", en: "Yes! (polite, Taglish)", say: "yes po", emoji: "😄" }
          ],
          tip: {
            title: 'Taglish & the tapped "r"',
            body: 'Modern speakers happily mix Tagalog and English — this is called Taglish, and "Yes po!" is a friendly favourite that pairs English with Filipino respect. Roll your r lightly (a "tapped r," like Spanish), not the hard American r.'
          },
          quiz: {
            type: "mc",
            q: 'Match the English phrase "Take care" to its Tagalog equivalent.',
            options: ["Mahal kita", "Ingat ka", "Paalam"],
            answer: "Ingat ka",
            explain: "Ingat ka = Take care."
          }
        },
        {
          id: "u6l2",
          title: "Holidays & Values",
          skill: "reading",
          vocab: [
            { tl: "Maligayang Pasko", en: "Merry Christmas", say: "ma-li-GA-yang pas-KO", emoji: "🎄" },
            { tl: "Bagong Taon", en: "New Year", say: "BA-gong TA-on", emoji: "🎆" },
            { tl: "Bayanihan", en: "Community cooperation", say: "ba-ya-NI-han", emoji: "🤲" },
            { tl: "Maligayang Bati", en: "Congratulations / Happy greetings", say: "ma-li-GA-yang BA-ti", emoji: "🎉" },
            { tl: "Pamilya", en: "Family", say: "pa-MIL-ya", emoji: "👨‍👩‍👧‍👦" }
          ],
          tip: {
            title: "Bayanihan & the longest Christmas",
            body: 'Bayanihan is the cherished value of community — neighbours helping one another with nothing expected in return. And Filipino Christmas is the world\'s longest, with the season starting in September!'
          },
          quiz: {
            type: "mc",
            q: "Which Filipino value emphasizes community cooperation and helping others?",
            options: ["Bayanihan", "Taglish", "Tawad"],
            answer: "Bayanihan",
            explain: "Bayanihan = community spirit and mutual help."
          }
        }
      ]
    }
  ]
};

/* Flatten helpers ----------------------------------------------------- */
export function allLessons() {
  const out = [];
  COURSE.units.forEach((u) => u.lessons.forEach((l) => out.push({ ...l, unitId: u.id, unitTitle: u.title, unitColor: u.color })));
  return out;
}

export function lessonById(id) {
  return allLessons().find((l) => l.id === id) || null;
}

export function unitById(id) {
  return COURSE.units.find((u) => u.id === id) || null;
}
