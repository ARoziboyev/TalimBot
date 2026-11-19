const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const pad = (n) => String(n).padStart(2, "0");

const fmtDate = (value) => {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// "25.12.2026 14:30" -> Date
const parseDate = (s) => {
  const m = String(s || "")
    .trim()
    .match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi] = m.map(Number);
  const d = new Date(yyyy, mm - 1, dd, hh, mi);
  if (isNaN(d) || d.getDate() !== dd || d.getMonth() !== mm - 1) return null;
  return d;
};

const getText = (ctx) => (ctx.message && typeof ctx.message.text === "string" ? ctx.message.text.trim() : null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STATUS = {
  new: "🆕 Yangi",
  review: "🔍 Ko'rib chiqilmoqda",
  approved: "✅ Qabul qilindi",
  rejected: "❌ Rad etildi",
};

const CATEGORIES = [
  "📚 Ta'lim sifati",
  "💻 Raqamli ta'lim",
  "🏫 Infratuzilma",
  "🌱 Yoshlar tashabbusi",
  "🔬 Ilmiy-tadqiqot",
  "👩‍🏫 O'qituvchilar malakasi",
  "♿ Inklyuziv ta'lim",
  "📦 Boshqa",
];

const ROLES = ["🎓 O'quvchi", "🧑‍🎓 Talaba", "👩‍🏫 O'qituvchi", "👨‍👩‍👧 Ota-ona", "🏛 Ta'lim muassasasi xodimi", "👤 Boshqa"];

const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Andijon", "Buxoro", "Farg'ona", "Jizzax",
  "Xorazm", "Namangan", "Navoiy", "Qashqadaryo", "Samarqand", "Sirdaryo",
  "Surxondaryo", "Qoraqalpog'iston",
];

module.exports = { esc, fmtDate, parseDate, getText, sleep, STATUS, CATEGORIES, ROLES, REGIONS };
