const { Markup } = require("telegraf");

const BTN = {
  // Asosiy menyu
  PROPOSE: "💡 Loyiha taklif qilish",
  MY: "📂 Mening takliflarim",
  NEWS: "📰 Yangiliklar",
  EVENTS: "📅 Tadbirlar",
  ASK: "❓ Savol / Murojaat",
  ABOUT: "ℹ️ Biz haqimizda",
  CONTACT: "📞 Aloqa",
  PROFILE: "👤 Profilim",
  ADMIN: "🛠 Admin panel",
  // Umumiy
  CANCEL: "❌ Bekor qilish",
  SKIP: "⏭ O'tkazib yuborish",
  SEND: "✅ Yuborish",
  BACK: "⬅️ Asosiy menyu",
  SHARE_PHONE: "📱 Raqamni yuborish",
  // Admin
  STATS: "📊 Statistika",
  PENDING: "📥 Yangi takliflar",
  QUESTIONS: "💬 Javobsiz savollar",
  ADD_NEWS: "📰 Yangilik qo'shish",
  ADD_EVENT: "📅 Tadbir qo'shish",
  MANAGE: "🗂 Yangilik/tadbirlarni boshqarish",
  BROADCAST: "📣 Hammaga xabar",
  EXPORT: "📤 Takliflarni yuklab olish (CSV)",
  PUBLISH_ALL: "📣 Saqlash va hammaga yuborish",
  SAVE_ONLY: "💾 Faqat saqlash",
};

const mainMenu = (isAdmin = false) => {
  const rows = [
    [BTN.PROPOSE],
    [BTN.MY, BTN.ASK],
    [BTN.NEWS, BTN.EVENTS],
    [BTN.PROFILE, BTN.ABOUT, BTN.CONTACT],
  ];
  if (isAdmin) rows.push([BTN.ADMIN]);
  return Markup.keyboard(rows).resize();
};

const adminMenu = () =>
  Markup.keyboard([
    [BTN.PENDING, BTN.QUESTIONS],
    [BTN.ADD_NEWS, BTN.ADD_EVENT],
    [BTN.MANAGE],
    [BTN.STATS, BTN.BROADCAST],
    [BTN.EXPORT],
    [BTN.BACK],
  ]).resize();

const cancel = () => Markup.keyboard([[BTN.CANCEL]]).resize();
const skipCancel = () => Markup.keyboard([[BTN.SKIP], [BTN.CANCEL]]).resize();
const confirm = () => Markup.keyboard([[BTN.SEND], [BTN.CANCEL]]).resize();
const publish = () => Markup.keyboard([[BTN.PUBLISH_ALL], [BTN.SAVE_ONLY], [BTN.CANCEL]]).resize();

// Ro'yxatni 2 ustunli klaviaturaga aylantirish
const grid = (items, cols = 2, extra = [[BTN.CANCEL]]) => {
  const rows = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return Markup.keyboard([...rows, ...extra]).resize();
};

const phone = () =>
  Markup.keyboard([[Markup.button.contactRequest(BTN.SHARE_PHONE)], [BTN.CANCEL]]).resize();

module.exports = { BTN, mainMenu, adminMenu, cancel, skipCancel, confirm, publish, grid, phone };
