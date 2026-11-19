// Buyruqlar va inline tugmalar. Ular Stage ga ulanadi, shuning uchun
// foydalanuvchi biror sahna ichida bo'lsa ham ishlaydi.
const { Markup } = require("telegraf");
const config = require("../config");
const db = require("../db");
const kb = require("../keyboards");
const n = require("../notify");
const { esc, fmtDate, STATUS } = require("../utils");
const texts = require("../texts");

const H = { parse_mode: "HTML" };

async function showMenu(ctx, text) {
  return ctx.reply(text, { ...H, ...kb.mainMenu(config.isAdmin(ctx.from.id)) });
}

const adminOnly = (fn) => async (ctx) => {
  if (!config.isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔️ Faqat adminlar uchun", { show_alert: true });
  return fn(ctx);
};

module.exports = function registerCallbacks(stage) {
  /* ---------------- Buyruqlar ---------------- */
  stage.start(async (ctx) => {
    if (ctx.chat.type !== "private") return;
    if (ctx.scene.current) await ctx.scene.leave();
    const u = db.touchUser(ctx.from);
    if (!u.registered) {
      await ctx.reply(texts.welcomeNew(ctx.from.first_name), H);
      return ctx.scene.enter("register");
    }
    return showMenu(ctx, texts.welcomeBack(u.fullName));
  });

  stage.command("menu", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    if (ctx.scene.current) await ctx.scene.leave();
    return showMenu(ctx, "Asosiy menyu 👇");
  });

  stage.help((ctx) => ctx.reply(texts.help, H));

  stage.command("admin", async (ctx) => {
    if (!config.isAdmin(ctx.from.id) || ctx.chat.type !== "private") return;
    if (ctx.scene.current) await ctx.scene.leave();
    return ctx.reply("🛠 Admin panel", kb.adminMenu());
  });

  // Guruh ID sini bilish uchun (ADMIN_CHAT_ID sozlash)
  stage.command("chatid", (ctx) => ctx.reply(`Chat ID: <code>${ctx.chat.id}</code>`, H));

  /* ---------------- Takliflar (admin) ---------------- */
  stage.action(/^p:(review|approve):(\d+)$/, adminOnly(async (ctx) => {
    const [, action, id] = ctx.match;
    const status = action === "review" ? "review" : "approved";
    const old = db.getProposal(id);
    if (!old) return ctx.answerCbQuery("Taklif topilmadi");
    if (old.status === status) return ctx.answerCbQuery("Holat allaqachon shunday");

    const p = db.updateProposal(id, { status }, ctx.from.id);
    await ctx.answerCbQuery(STATUS[status]);
    try {
      await ctx.editMessageText(n.proposalCard(p) + `\n\n👮 ${esc(ctx.from.first_name)}`, { ...H, ...n.proposalButtons(p) });
    } catch (_) {}

    const msg =
      status === "approved"
        ? `🎉 <b>Tabriklaymiz!</b> Taklifingiz #${p.id} «${esc(p.title)}» qo'mita tomonidan <b>qabul qilindi</b>.\nKeyingi qadamlar bo'yicha mutaxassislarimiz siz bilan bog'lanishadi.`
        : `🔍 Taklifingiz #${p.id} «${esc(p.title)}» <b>ko'rib chiqishga olindi</b>. Natija haqida xabar beramiz.`;
    try {
      await ctx.telegram.sendMessage(p.userId, msg, H);
    } catch (e) {
      if (e.code === 403) db.markBlocked(p.userId);
    }
  }));

  stage.action(/^p:(reject|msg):(\d+)$/, adminOnly(async (ctx) => {
    const [, action, id] = ctx.match;
    if (!db.getProposal(id)) return ctx.answerCbQuery("Taklif topilmadi");
    await ctx.answerCbQuery();
    return ctx.scene.enter("adminText", {
      kind: action === "reject" ? "reject" : "pmsg",
      id: Number(id),
      cardChat: ctx.chat.id,
      cardMsg: ctx.callbackQuery.message?.message_id,
    });
  }));

  /* ---------------- Savollar (admin) ---------------- */
  stage.action(/^q:ans:(\d+)$/, adminOnly(async (ctx) => {
    const q = db.getQuestion(ctx.match[1]);
    if (!q) return ctx.answerCbQuery("Topilmadi");
    if (q.answered) return ctx.answerCbQuery("Allaqachon javob berilgan", { show_alert: true });
    await ctx.answerCbQuery();
    return ctx.scene.enter("adminText", {
      kind: "answer",
      id: q.id,
      cardChat: ctx.chat.id,
      cardMsg: ctx.callbackQuery.message?.message_id,
    });
  }));

  /* ---------------- Foydalanuvchi: o'z taklifini ko'rish ---------------- */
  stage.action(/^p:view:(\d+)$/, async (ctx) => {
    const p = db.getProposal(ctx.match[1]);
    if (!p || (p.userId !== ctx.from.id && !config.isAdmin(ctx.from.id))) return ctx.answerCbQuery("Topilmadi");
    await ctx.answerCbQuery();
    await ctx.reply(n.proposalCard(p, { forAdmin: false }), H);
    if (p.file) await n.sendFile(ctx.telegram, ctx.chat.id, p.file, `📎 Taklif #${p.id} ilovasi`);
  });

  /* ---------------- Tadbirlar ---------------- */
  stage.action(/^e:reg:(\d+)$/, async (ctx) => {
    const u = db.getUser(ctx.from.id);
    if (!u?.registered) return ctx.answerCbQuery("Avval /start orqali ro'yxatdan o'ting", { show_alert: true });
    const e = db.getEvent(ctx.match[1]);
    if (!e) return ctx.answerCbQuery("Tadbir topilmadi");
    if (new Date(e.date) < new Date()) return ctx.answerCbQuery("Tadbir allaqachon o'tgan", { show_alert: true });
    const joined = db.toggleEventReg(e.id, ctx.from.id);
    await ctx.answerCbQuery(joined ? "✅ Ro'yxatdan o'tdingiz! Tadbirdan oldin eslatma yuboramiz." : "Ro'yxatdan chiqdingiz", {
      show_alert: joined,
    });
    try {
      await ctx.editMessageText(n.eventText(e), { ...H, ...n.eventButtons(e, ctx.from.id, config.isAdmin(ctx.from.id)) });
    } catch (_) {}
  });

  stage.action(/^e:who:(\d+)$/, adminOnly(async (ctx) => {
    const e = db.getEvent(ctx.match[1]);
    if (!e) return ctx.answerCbQuery("Topilmadi");
    await ctx.answerCbQuery();
    if (!e.participants.length) return ctx.reply("Hali hech kim ro'yxatdan o'tmagan.");
    const lines = e.participants.map((id, i) => {
      const u = db.getUser(id) || {};
      return `${i + 1}. ${esc(u.fullName || u.firstName)} — ${esc(u.phone || "")} ${u.username ? "@" + esc(u.username) : ""}`;
    });
    const header = `👥 <b>${esc(e.title)}</b> (${fmtDate(e.date)}) — ${e.participants.length} kishi\n\n`;
    // Uzun ro'yxatni bo'lib yuborish
    let chunk = header;
    for (const line of lines) {
      if ((chunk + line).length > 3900) {
        await ctx.reply(chunk, H);
        chunk = "";
      }
      chunk += line + "\n";
    }
    if (chunk) await ctx.reply(chunk, H);
  }));

  stage.action(/^e:del:(\d+)$/, adminOnly(async (ctx) => {
    const ok = db.deleteEvent(ctx.match[1]);
    await ctx.answerCbQuery(ok ? "🗑 O'chirildi" : "Topilmadi");
    if (ok) try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (_) {}
  }));

  stage.action(/^n:del:(\d+)$/, adminOnly(async (ctx) => {
    const ok = db.deleteNews(ctx.match[1]);
    await ctx.answerCbQuery(ok ? "🗑 O'chirildi" : "Topilmadi");
    if (ok) try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (_) {}
  }));

  /* ---------------- Profil ---------------- */
  stage.action("u:edit", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter("register");
  });

  // Ko'proq takliflarni ko'rsatish (sahifalash)
  stage.action(/^my:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return sendMyProposals(ctx, Number(ctx.match[1]));
  });
};

/* Mening takliflarim — sahifalab */
const PAGE = 8;
async function sendMyProposals(ctx, page = 0) {
  const list = db.userProposals(ctx.from.id);
  if (!list.length) {
    return ctx.reply(`Sizda hali takliflar yo'q.\n«${kb.BTN.PROPOSE}» tugmasi orqali birinchi taklifingizni yuboring! 🚀`);
  }
  const slice = list.slice(page * PAGE, page * PAGE + PAGE);
  const text =
    `📂 <b>Mening takliflarim</b> (${list.length} ta)\n\n` +
    slice.map((p) => `<b>#${p.id}</b> ${esc(p.title)}\n${STATUS[p.status]} · ${fmtDate(p.createdAt)}`).join("\n\n") +
    "\n\nBatafsil ko'rish uchun raqamni bosing 👇";
  const buttons = slice.map((p) => Markup.button.callback(`#${p.id}`, `p:view:${p.id}`));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 4) rows.push(buttons.slice(i, i + 4));
  const nav = [];
  if (page > 0) nav.push(Markup.button.callback("⬅️ Oldingi", `my:${page - 1}`));
  if ((page + 1) * PAGE < list.length) nav.push(Markup.button.callback("Keyingi ➡️", `my:${page + 1}`));
  if (nav.length) rows.push(nav);
  return ctx.reply(text, { ...H, ...Markup.inlineKeyboard(rows) });
}

module.exports.sendMyProposals = sendMyProposals;
