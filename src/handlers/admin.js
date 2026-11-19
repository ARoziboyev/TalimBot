// Admin panel
const { Markup } = require("telegraf");
const config = require("../config");
const db = require("../db");
const kb = require("../keyboards");
const n = require("../notify");
const { esc, fmtDate, STATUS } = require("../utils");

const H = { parse_mode: "HTML" };

const admin = (fn) => (ctx, next) => {
  if (ctx.chat.type !== "private" || !config.isAdmin(ctx.from.id)) return next();
  return fn(ctx);
};

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

module.exports = function registerAdmin(bot) {
  bot.hears(kb.BTN.ADMIN, admin((ctx) => ctx.reply("🛠 Admin panel", kb.adminMenu())));

  bot.hears(kb.BTN.PENDING, admin(async (ctx) => {
    const list = db.proposalsByStatus(["new", "review"]).sort((a, b) => a.id - b.id);
    if (!list.length) return ctx.reply("✅ Ko'rib chiqilmagan takliflar yo'q.");
    await ctx.reply(`📥 Ko'rib chiqilishi kerak: <b>${list.length}</b> ta (eng eskilari birinchi, 10 tadan)`, H);
    for (const p of list.slice(0, 10)) {
      await ctx.reply(n.proposalCard(p), { ...H, ...n.proposalButtons(p) });
      if (p.file) await n.sendFile(ctx.telegram, ctx.chat.id, p.file, `📎 Taklif #${p.id} ilovasi`);
    }
  }));

  bot.hears(kb.BTN.QUESTIONS, admin(async (ctx) => {
    const list = db.unansweredQuestions();
    if (!list.length) return ctx.reply("✅ Javobsiz murojaatlar yo'q.");
    await ctx.reply(`💬 Javobsiz murojaatlar: <b>${list.length}</b> ta`, H);
    for (const q of list.slice(0, 10)) {
      await ctx.reply(n.questionCard(q), { ...H, ...n.questionButtons(q) });
    }
  }));

  bot.hears(kb.BTN.ADD_NEWS, admin((ctx) => ctx.scene.enter("addNews")));
  bot.hears(kb.BTN.ADD_EVENT, admin((ctx) => ctx.scene.enter("addEvent")));
  bot.hears(kb.BTN.BROADCAST, admin((ctx) => ctx.scene.enter("broadcast")));

  bot.hears(kb.BTN.MANAGE, admin(async (ctx) => {
    const news = db.latestNews(5);
    const events = db.upcomingEvents();
    if (!news.length && !events.length) return ctx.reply("Hozircha yangilik yoki tadbir yo'q.");
    for (const x of news) {
      await ctx.reply(`📰 #${x.id} <b>${esc(x.title)}</b>\n${fmtDate(x.createdAt)}`, {
        ...H,
        ...Markup.inlineKeyboard([[Markup.button.callback("🗑 O'chirish", `n:del:${x.id}`)]]),
      });
    }
    for (const e of events) {
      await ctx.reply(`📅 #${e.id} <b>${esc(e.title)}</b>\n${fmtDate(e.date)} · 👥 ${e.participants.length}`, {
        ...H,
        ...Markup.inlineKeyboard([
          [Markup.button.callback("👥 Qatnashchilar", `e:who:${e.id}`), Markup.button.callback("🗑 O'chirish", `e:del:${e.id}`)],
        ]),
      });
    }
  }));

  bot.hears(kb.BTN.STATS, admin((ctx) => {
    const s = db.stats();
    const top = (obj) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k, v]) => `  • ${esc(k)}: ${v}`)
        .join("\n") || "  —";
    return ctx.reply(
      `📊 <b>Statistika</b>\n\n` +
        `👥 Foydalanuvchilar: <b>${s.users}</b> (ro'yxatdan o'tgan: ${s.registered}, bloklagan: ${s.blocked})\n` +
        `🆕 Oxirgi 7 kunda qo'shilgan: ${s.newUsersWeek}\n\n` +
        `💡 Takliflar: <b>${s.proposals}</b> (7 kunda: ${s.proposalsWeek})\n` +
        `  ${STATUS.new}: ${s.byStatus.new}\n  ${STATUS.review}: ${s.byStatus.review}\n` +
        `  ${STATUS.approved}: ${s.byStatus.approved}\n  ${STATUS.rejected}: ${s.byStatus.rejected}\n\n` +
        `📁 Yo'nalishlar bo'yicha:\n${top(s.byCategory)}\n\n` +
        `🗺 Hududlar bo'yicha:\n${top(s.byRegion)}\n\n` +
        `❓ Murojaatlar: ${s.questions} (javobsiz: ${s.unanswered})\n` +
        `📰 Yangiliklar: ${s.news}\n📅 Tadbirlar: ${s.events} (kelgusi: ${s.upcoming})`,
      H
    );
  }));

  bot.hears(kb.BTN.EXPORT, admin(async (ctx) => {
    const list = db.allProposals();
    if (!list.length) return ctx.reply("Takliflar yo'q.");
    const head = ["ID", "Sana", "Holat", "Yo'nalish", "Nomi", "Tavsif", "Natija/byudjet", "Ilova",
      "Muallif", "Maqom", "Hudud", "Telefon", "Username", "Rad etish sababi"];
    const rows = list.map((p) => {
      const u = db.getUser(p.userId) || {};
      return [p.id, fmtDate(p.createdAt), STATUS[p.status], p.category, p.title, p.description, p.result,
        p.file ? p.file.name || "bor" : "", u.fullName, u.role, u.region, u.phone,
        u.username ? "@" + u.username : "", p.rejectReason].map(csvCell).join(";");
    });
    // BOM — Excel o'zbek harflarini to'g'ri ochishi uchun; ";" — Excel ustun ajratgichi
    const csv = "﻿" + [head.map(csvCell).join(";"), ...rows].join("\r\n");
    const date = new Date().toISOString().slice(0, 10);
    return ctx.replyWithDocument(
      { source: Buffer.from(csv, "utf8"), filename: `takliflar_${date}.csv` },
      { caption: `📤 Jami ${list.length} ta taklif` }
    );
  }));
};
