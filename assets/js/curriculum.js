/* =====================================================================
 * curriculum.js — Tagalog/Filipino course content for English (Canadian) speakers
 * ---------------------------------------------------------------------
 * The course is organized into UNITS. Each unit contains LESSONS.
 * Every lesson has a `skill` tag (reading | writing | speaking | listening)
 * and a `vocab` list. Exercises are generated from the vocab at runtime
 * (see lessons.js), so adding new content is as simple as adding vocab.
 *
 * vocab item shape:
 *   { tl: "Salamat", en: "Thank you", say: "sa-LA-mat", note?: "...", emoji?: "🙏" }
 *     tl  = Tagalog / Filipino
 *     en  = English (Canadian) meaning
 *     say = simple pronunciation guide (CAPS = stressed syllable)
 * ===================================================================== */

export const COURSE = {
  language: "Tagalog / Filipino",
  from: "English (Canada)",
  units: [
    {
      id: "u1",
      title: "Greetings",
      subtitle: "Mga Pagbati",
      color: "#1f9d8f",
      icon: "👋",
      lessons: [
        {
          id: "u1l1",
          title: "Hello & Goodbye",
          skill: "reading",
          vocab: [
            { tl: "Kumusta", en: "Hello / How are you", say: "ku-mus-TA", emoji: "👋" },
            { tl: "Mabuhay", en: "Welcome (lit. long live)", say: "ma-BU-hay", emoji: "🎉" },
            { tl: "Paalam", en: "Goodbye", say: "pa-A-lam", emoji: "👋" },
            { tl: "Oo", en: "Yes", say: "O-o", emoji: "✅" },
            { tl: "Hindi", en: "No", say: "hin-DEE", emoji: "❌" },
            { tl: "Sige", en: "Okay / Sure", say: "SEE-geh", emoji: "👍" }
          ]
        },
        {
          id: "u1l2",
          title: "Times of Day",
          skill: "reading",
          vocab: [
            { tl: "Magandang umaga", en: "Good morning", say: "ma-gan-DANG u-MA-ga", emoji: "🌅" },
            { tl: "Magandang tanghali", en: "Good noon", say: "ma-gan-DANG tang-HA-li", emoji: "☀️" },
            { tl: "Magandang hapon", en: "Good afternoon", say: "ma-gan-DANG HA-pon", emoji: "🌤️" },
            { tl: "Magandang gabi", en: "Good evening", say: "ma-gan-DANG ga-BEE", emoji: "🌙" },
            { tl: "Maganda", en: "Beautiful / Good", say: "ma-gan-DA", emoji: "✨" }
          ]
        },
        {
          id: "u1l3",
          title: "Polite Words",
          skill: "writing",
          vocab: [
            { tl: "Salamat", en: "Thank you", say: "sa-LA-mat", emoji: "🙏" },
            { tl: "Maraming salamat", en: "Thank you very much", say: "ma-RA-ming sa-LA-mat", emoji: "🙏" },
            { tl: "Walang anuman", en: "You're welcome", say: "wa-LANG a-nu-MAN", emoji: "😊" },
            { tl: "Pasensya na", en: "Sorry / Excuse me", say: "pa-SEN-sya na", emoji: "🙇" },
            { tl: "Pakiusap", en: "Please", say: "pa-ki-U-sap", emoji: "🙏" }
          ]
        },
        {
          id: "u1l4",
          title: "Say it out loud",
          skill: "speaking",
          vocab: [
            { tl: "Kumusta", en: "Hello / How are you", say: "ku-mus-TA", emoji: "👋" },
            { tl: "Salamat", en: "Thank you", say: "sa-LA-mat", emoji: "🙏" },
            { tl: "Paalam", en: "Goodbye", say: "pa-A-lam", emoji: "👋" },
            { tl: "Magandang umaga", en: "Good morning", say: "ma-gan-DANG u-MA-ga", emoji: "🌅" }
          ]
        }
      ]
    },

    {
      id: "u2",
      title: "Getting Acquainted",
      subtitle: "Pagkikilala",
      color: "#e0883b",
      icon: "🤝",
      lessons: [
        {
          id: "u2l1",
          title: "Introducing Yourself",
          skill: "reading",
          vocab: [
            { tl: "Ako si", en: "I am (name)", say: "a-KO see", emoji: "🙋" },
            { tl: "Anong pangalan mo?", en: "What is your name?", say: "a-NONG pa-NGA-lan mo", emoji: "❓" },
            { tl: "Ang pangalan ko ay", en: "My name is", say: "ang pa-NGA-lan ko eye", emoji: "🪪" },
            { tl: "Ikaw?", en: "And you?", say: "ee-KAW", emoji: "👉" },
            { tl: "Mabuti naman", en: "I'm fine", say: "ma-BU-ti na-MAN", emoji: "😄" }
          ]
        },
        {
          id: "u2l2",
          title: "Nice to Meet You",
          skill: "writing",
          vocab: [
            { tl: "Ikinagagalak kong makilala ka", en: "Nice to meet you", say: "i-ki-na-ga-GA-lak kong ma-ki-LA-la ka", emoji: "🤝" },
            { tl: "Taga-saan ka?", en: "Where are you from?", say: "ta-ga-sa-AN ka", emoji: "🌍" },
            { tl: "Taga-Canada ako", en: "I'm from Canada", say: "ta-ga-Canada a-KO", emoji: "🇨🇦" },
            { tl: "Nakatira ako sa", en: "I live in", say: "na-ka-ti-RA a-ko sa", emoji: "🏠" },
            { tl: "Kaibigan", en: "Friend", say: "ka-i-BI-gan", emoji: "👫" }
          ]
        },
        {
          id: "u2l3",
          title: "Conversation: First Meeting",
          skill: "speaking",
          vocab: [
            { tl: "Kumusta ka?", en: "How are you?", say: "ku-mus-TA ka", emoji: "🙂" },
            { tl: "Mabuti naman, salamat", en: "I'm fine, thank you", say: "ma-BU-ti na-man sa-LA-mat", emoji: "😊" },
            { tl: "Anong pangalan mo?", en: "What is your name?", say: "a-NONG pa-NGA-lan mo", emoji: "❓" },
            { tl: "Ikinagagalak kong makilala ka", en: "Nice to meet you", say: "i-ki-na-ga-GA-lak kong ma-ki-LA-la ka", emoji: "🤝" }
          ]
        }
      ]
    },

    {
      id: "u3",
      title: "Numbers",
      subtitle: "Mga Numero",
      color: "#3b6fe0",
      icon: "🔢",
      lessons: [
        {
          id: "u3l1",
          title: "One to Five",
          skill: "reading",
          vocab: [
            { tl: "Isa", en: "One", say: "ee-SA", emoji: "1️⃣" },
            { tl: "Dalawa", en: "Two", say: "da-la-WA", emoji: "2️⃣" },
            { tl: "Tatlo", en: "Three", say: "tat-LO", emoji: "3️⃣" },
            { tl: "Apat", en: "Four", say: "A-pat", emoji: "4️⃣" },
            { tl: "Lima", en: "Five", say: "li-MA", emoji: "5️⃣" }
          ]
        },
        {
          id: "u3l2",
          title: "Six to Ten",
          skill: "writing",
          vocab: [
            { tl: "Anim", en: "Six", say: "A-nim", emoji: "6️⃣" },
            { tl: "Pito", en: "Seven", say: "pi-TO", emoji: "7️⃣" },
            { tl: "Walo", en: "Eight", say: "wa-LO", emoji: "8️⃣" },
            { tl: "Siyam", en: "Nine", say: "si-YAM", emoji: "9️⃣" },
            { tl: "Sampu", en: "Ten", say: "sam-POO", emoji: "🔟" }
          ]
        },
        {
          id: "u3l3",
          title: "Count out loud",
          skill: "speaking",
          vocab: [
            { tl: "Isa", en: "One", say: "ee-SA", emoji: "1️⃣" },
            { tl: "Tatlo", en: "Three", say: "tat-LO", emoji: "3️⃣" },
            { tl: "Lima", en: "Five", say: "li-MA", emoji: "5️⃣" },
            { tl: "Sampu", en: "Ten", say: "sam-POO", emoji: "🔟" }
          ]
        }
      ]
    },

    {
      id: "u4",
      title: "Family",
      subtitle: "Pamilya",
      color: "#c0497a",
      icon: "👨‍👩‍👧‍👦",
      lessons: [
        {
          id: "u4l1",
          title: "Parents & Siblings",
          skill: "reading",
          vocab: [
            { tl: "Nanay", en: "Mother", say: "na-NAY", emoji: "👩" },
            { tl: "Tatay", en: "Father", say: "ta-TAY", emoji: "👨" },
            { tl: "Ate", en: "Older sister", say: "A-teh", emoji: "👧" },
            { tl: "Kuya", en: "Older brother", say: "KU-ya", emoji: "👦" },
            { tl: "Kapatid", en: "Sibling", say: "ka-pa-TID", emoji: "🧒" }
          ]
        },
        {
          id: "u4l2",
          title: "The Whole Family",
          skill: "writing",
          vocab: [
            { tl: "Lola", en: "Grandmother", say: "LO-la", emoji: "👵" },
            { tl: "Lolo", en: "Grandfather", say: "LO-lo", emoji: "👴" },
            { tl: "Anak", en: "Child", say: "a-NAK", emoji: "👶" },
            { tl: "Asawa", en: "Spouse", say: "a-SA-wa", emoji: "💍" },
            { tl: "Pamilya", en: "Family", say: "pa-MIL-ya", emoji: "👨‍👩‍👧‍👦" }
          ]
        },
        {
          id: "u4l3",
          title: "Talk about family",
          skill: "speaking",
          vocab: [
            { tl: "Nanay", en: "Mother", say: "na-NAY", emoji: "👩" },
            { tl: "Tatay", en: "Father", say: "ta-TAY", emoji: "👨" },
            { tl: "Pamilya", en: "Family", say: "pa-MIL-ya", emoji: "👨‍👩‍👧‍👦" },
            { tl: "Mahal kita", en: "I love you", say: "ma-HAL ki-TA", emoji: "❤️" }
          ]
        }
      ]
    },

    {
      id: "u5",
      title: "Food & Drink",
      subtitle: "Pagkain at Inumin",
      color: "#d4a017",
      icon: "🍚",
      lessons: [
        {
          id: "u5l1",
          title: "On the Table",
          skill: "reading",
          vocab: [
            { tl: "Kanin", en: "Rice", say: "KA-nin", emoji: "🍚" },
            { tl: "Tubig", en: "Water", say: "TU-big", emoji: "💧" },
            { tl: "Manok", en: "Chicken", say: "ma-NOK", emoji: "🍗" },
            { tl: "Isda", en: "Fish", say: "is-DA", emoji: "🐟" },
            { tl: "Gulay", en: "Vegetable", say: "GU-lay", emoji: "🥬" }
          ]
        },
        {
          id: "u5l2",
          title: "Snacks & Drinks",
          skill: "writing",
          vocab: [
            { tl: "Prutas", en: "Fruit", say: "PRU-tas", emoji: "🍎" },
            { tl: "Kape", en: "Coffee", say: "ka-PEH", emoji: "☕" },
            { tl: "Gatas", en: "Milk", say: "GA-tas", emoji: "🥛" },
            { tl: "Masarap", en: "Delicious", say: "ma-sa-RAP", emoji: "😋" },
            { tl: "Gutom", en: "Hungry", say: "gu-TOM", emoji: "🤤" }
          ]
        },
        {
          id: "u5l3",
          title: "Order out loud",
          skill: "speaking",
          vocab: [
            { tl: "Tubig", en: "Water", say: "TU-big", emoji: "💧" },
            { tl: "Kanin", en: "Rice", say: "KA-nin", emoji: "🍚" },
            { tl: "Kape", en: "Coffee", say: "ka-PEH", emoji: "☕" },
            { tl: "Masarap", en: "Delicious", say: "ma-sa-RAP", emoji: "😋" }
          ]
        }
      ]
    },

    {
      id: "u6",
      title: "Out & About",
      subtitle: "Pang-araw-araw",
      color: "#7a3bc0",
      icon: "🗺️",
      lessons: [
        {
          id: "u6l1",
          title: "Useful Questions",
          skill: "reading",
          vocab: [
            { tl: "Magkano ito?", en: "How much is this?", say: "mag-KA-no i-TO", emoji: "💰" },
            { tl: "Saan ang banyo?", en: "Where is the bathroom?", say: "sa-AN ang BAN-yo", emoji: "🚻" },
            { tl: "Anong oras na?", en: "What time is it?", say: "a-NONG O-ras na", emoji: "🕐" },
            { tl: "Saan ka pupunta?", en: "Where are you going?", say: "sa-AN ka pu-pun-TA", emoji: "🚶" }
          ]
        },
        {
          id: "u6l2",
          title: "Getting Help",
          skill: "writing",
          vocab: [
            { tl: "Hindi ko maintindihan", en: "I don't understand", say: "hin-DI ko ma-in-tin-di-HAN", emoji: "🤔" },
            { tl: "Pakitulungan mo ako", en: "Please help me", say: "pa-ki-tu-LU-ngan mo a-ko", emoji: "🆘" },
            { tl: "Tulong!", en: "Help!", say: "TU-long", emoji: "🚨" },
            { tl: "Marunong ka ba mag-Ingles?", en: "Do you speak English?", say: "ma-RU-nong ka ba mag-ing-LES", emoji: "💬" }
          ]
        },
        {
          id: "u6l3",
          title: "Heartfelt phrases",
          skill: "speaking",
          vocab: [
            { tl: "Mahal kita", en: "I love you", say: "ma-HAL ki-TA", emoji: "❤️" },
            { tl: "Ingat ka", en: "Take care", say: "I-ngat ka", emoji: "🤗" },
            { tl: "Mabuhay", en: "Cheers / Long live", say: "ma-BU-hay", emoji: "🎉" },
            { tl: "Salamat sa lahat", en: "Thanks for everything", say: "sa-LA-mat sa la-HAT", emoji: "🙏" }
          ]
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
