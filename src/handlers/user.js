// Foydalanuvchi menyusi
const { Markup } = require("telegraf");
const config = require("../config");
const db = require("../db");
const kb = require("../keyboards");
const n = require("../notify");
const texts = require("../texts");
const { esc, fmtDate } = require("../utils");
const { sendMyProposals } = require("./callbacks");

const H = { parse_mode: "HTML" };

// Ro'yxatdan o'tmaganlarni ro'yxatdan o'tkazish
const needReg = (fn) => async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const u = db.getUser(ctx.from.id);
  if (!u?.registered) {
    await ctx.reply("Avval qisqa ro'yxatdan o'ting 👇");
    return ctx.scene.enter("register");
  }
  return fn(ctx, u);
};

module.exports = function registerUser(bot) {
  bot.hears(kb.BTN.PROPOSE, needReg(async (ctx) => {
    const today = db.countUserProposalsToday(ctx.from.id);
    if (today >= config.DAILY_PROPOSAL_LIMIT && !config.isAdmin(ctx.from.id)) {
      return ctx.reply(`⏳ Bir kunda ko'pi bilan ${config.DAILY_PROPOSAL_LIMIT} ta taklif yuborish mumkin. Ertaga yana urinib ko'ring.`);
    }
    return ctx.scene.enter("proposal");
  }));

  bot.hears(kb.BTN.MY, needReg((ctx) => sendMyProposals(ctx, 0)));

  bot.hears(kb.BTN.ASK, needReg((ctx) => ctx.scene.enter("question")));

  bot.hears(kb.BTN.NEWS, async (ctx) => {
    const list = db.latestNews(5);
    if (!list.length) return ctx.reply("Hozircha yangiliklar yo'q.");
    for (const item of list.reverse()) {
      await n.sendNews(ctx.telegram, ctx.chat.id, item);
    }
  });

  bot.hears(kb.BTN.EVENTS, async (ctx) => {
    const list = db.upcomingEvents();
    if (!list.length) return ctx.reply("Yaqin orada rejalashtirilgan tadbirlar yo'q. Yangi tadbirlar haqida xabar beramiz! 🔔");
    const admin = config.isAdmin(ctx.from.id);
    for (const e of list.slice(0, 10)) {
      await ctx.reply(n.eventText(e), { ...H, ...n.eventButtons(e, ctx.from.id, admin) });
    }
  });

  bot.hears(kb.BTN.PROFILE, needReg(async (ctx, u) => {
    const mine = db.userProposals(u.id);
    const approved = mine.filter((p) => p.status === "approved").length;
    const events = db.upcomingEvents().filter((e) => e.participants.includes(u.id)).length;
    return ctx.reply(
      `👤 <b>Profilim</b>\n\n` +
        `Ism: ${esc(u.fullName)}\n` +
        `Maqom: ${esc(u.role)}\n` +
        `Hudud: ${esc(u.region)}\n` +
        `Telefon: ${esc(u.phone)}\n` +
        `Ro'yxatdan o'tgan: ${fmtDate(u.registeredAt || u.joinedAt)}\n\n` +
        `💡 Takliflar: ${mine.length} (qabul qilingan: ${approved})\n` +
        `📅 Yaqin tadbirlar: ${events}`,
      { ...H, ...Markup.inlineKeyboard([[Markup.button.callback("✏️ Ma'lumotlarni yangilash", "u:edit")]]) }
    );
  }));

  bot.hears(kb.BTN.ABOUT, (ctx) => ctx.reply(texts.about(), H));
  bot.hears(kb.BTN.CONTACT, (ctx) => ctx.reply(texts.contact(), H));

  bot.hears(kb.BTN.BACK, (ctx) =>
    ctx.reply("Asosiy menyu 👇", kb.mainMenu(config.isAdmin(ctx.from.id)))
  );
};
