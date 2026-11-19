// Admin sahnalari: javob/izoh yozish, yangilik, tadbir, ommaviy xabar
const { Scenes } = require("telegraf");
const db = require("../db");
const kb = require("../keyboards");
const { getText, parseDate, fmtDate, esc } = require("../utils");
const n = require("../notify");
const { withCancel, leaveToMenu } = require("./common");

const H = { parse_mode: "HTML" };

async function editCard(ctx, st, text, markup) {
  if (!st.cardChat || !st.cardMsg) return;
  try {
    await ctx.telegram.editMessageText(st.cardChat, st.cardMsg, undefined, text, { ...H, ...markup });
  } catch (_) {
    /* xabar o'zgarmagan yoki o'chirilgan bo'lishi mumkin */
  }
}

async function tell(ctx, userId, text) {
  try {
    await ctx.telegram.sendMessage(userId, text, H);
    return true;
  } catch (e) {
    if (e.code === 403) db.markBlocked(userId);
    return false;
  }
}

/* ============ 1. Rad etish sababi / muallifga xabar / savolga javob ============ */
const PROMPTS = {
  reject: (id) => `❌ Taklif #${id} ni rad etish sababini yozing (sababsiz bo'lsa «-» yuboring):`,
  pmsg: (id) => `💬 Taklif #${id} muallifiga yuboriladigan xabarni yozing:`,
  answer: (id) => `✍️ Murojaat #${id} ga javobingizni yozing:`,
};

const adminText = new Scenes.BaseScene("adminText");
withCancel(adminText);
adminText.enter((ctx) => ctx.reply(PROMPTS[ctx.scene.state.kind](ctx.scene.state.id), kb.cancel()));
adminText.on("text", async (ctx) => {
  const st = ctx.scene.state;
  const t = ctx.message.text.trim();
  const adminName = ctx.from.first_name || "Admin";

  if (st.kind === "reject") {
    const p = db.updateProposal(st.id, { status: "rejected", rejectReason: t === "-" ? null : t }, ctx.from.id);
    if (!p) return leaveToMenu(ctx, "Taklif topilmadi.");
    await editCard(ctx, st, n.proposalCard(p) + `\n\n👮 ${esc(adminName)}`, n.proposalButtons(p));
    const ok = await tell(
      ctx,
      p.userId,
      `📬 <b>Taklifingiz #${p.id} ko'rib chiqildi</b>\n«${esc(p.title)}»\n\nHolati: ❌ Rad etildi` +
        (p.rejectReason ? `\nSabab: ${esc(p.rejectReason)}` : "") +
        "\n\nTaklifingiz uchun rahmat! Yangi g'oyalaringizni kutib qolamiz."
    );
    return leaveToMenu(ctx, `Taklif #${p.id} rad etildi.${ok ? " Muallif xabardor qilindi." : " ⚠️ Muallifga yetkazib bo'lmadi."}`);
  }

  if (st.kind === "pmsg") {
    const p = db.updateProposal(st.id, { adminNote: t });
    if (!p) return leaveToMenu(ctx, "Taklif topilmadi.");
    const ok = await tell(ctx, p.userId, `💬 <b>Qo'mitadan xabar</b> (taklif #${p.id} — «${esc(p.title)}»):\n\n${esc(t)}`);
    return leaveToMenu(ctx, ok ? "✅ Xabar yuborildi." : "⚠️ Muallifga yetkazib bo'lmadi (botni bloklagan bo'lishi mumkin).");
  }

  if (st.kind === "answer") {
    const q = db.getQuestion(st.id);
    if (!q) return leaveToMenu(ctx, "Murojaat topilmadi.");
    if (q.answered) return leaveToMenu(ctx, "Bu murojaatga allaqachon javob berilgan.");
    db.updateQuestion(q.id, { answered: true, answer: t, answeredBy: ctx.from.id, answeredAt: new Date().toISOString() });
    await editCard(ctx, st, n.questionCard(q) + `\n👮 ${esc(adminName)}`, n.questionButtons(q));
    const ok = await tell(
      ctx,
      q.userId,
      `📩 <b>Murojaatingizga javob</b> (#${q.id})\n\n<i>${esc(q.text.slice(0, 500))}</i>\n\n✍️ ${esc(t)}`
    );
    return leaveToMenu(ctx, ok ? "✅ Javob yuborildi." : "⚠️ Foydalanuvchiga yetkazib bo'lmadi.");
  }
  return leaveToMenu(ctx);
});
adminText.on("message", (ctx) => ctx.reply("Iltimos, matn yuboring."));

/* ============ 2. Yangilik qo'shish ============ */
const newsScene = new Scenes.WizardScene(
  "addNews",
  async (ctx) => {
    ctx.wizard.state.n = {};
    await ctx.reply("📰 Yangilik sarlavhasini yozing:", kb.cancel());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length > 200) return ctx.reply("Sarlavha 1–200 belgi bo'lsin.");
    ctx.wizard.state.n.title = t;
    await ctx.reply("Yangilik matnini yozing:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length > 3500) return ctx.reply("Matn 1–3500 belgi bo'lsin.");
    ctx.wizard.state.n.body = t;
    await ctx.reply("Rasm yuboring (ixtiyoriy):", kb.skipCancel());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message?.photo) ctx.wizard.state.n.photo = ctx.message.photo.at(-1).file_id;
    else if (getText(ctx) !== kb.BTN.SKIP) return ctx.reply("Rasm yuboring yoki «O'tkazib yuborish» ni bosing.");
    await ctx.reply("👀 Ko'rinishi:");
    await n.sendNews(ctx.telegram, ctx.chat.id, { ...ctx.wizard.state.n, createdAt: new Date() });
    await ctx.reply("Nima qilamiz?", kb.publish());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = getText(ctx);
    if (t !== kb.BTN.PUBLISH_ALL && t !== kb.BTN.SAVE_ONLY) return ctx.reply("Tugmalardan birini tanlang.");
    const item = db.addNews({ ...ctx.wizard.state.n, authorId: ctx.from.id });
    await leaveToMenu(ctx, `✅ Yangilik #${item.id} saqlandi.`);
    if (t === kb.BTN.PUBLISH_ALL) {
      await ctx.reply("📣 Tarqatilmoqda...");
      const r = await n.broadcast((id) => n.sendNews(ctx.telegram, id, item));
      await ctx.reply(`📣 Yuborildi: ${r.ok}/${r.total}. Xato: ${r.fail}`, kb.adminMenu());
    } else {
      await ctx.reply("Admin panel", kb.adminMenu());
    }
  }
);
withCancel(newsScene);

/* ============ 3. Tadbir qo'shish ============ */
const eventScene = new Scenes.WizardScene(
  "addEvent",
  async (ctx) => {
    ctx.wizard.state.e = {};
    await ctx.reply("📅 Tadbir nomini yozing:", kb.cancel());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length > 200) return ctx.reply("Nom 1–200 belgi bo'lsin.");
    ctx.wizard.state.e.title = t;
    await ctx.reply("Tadbir haqida qisqacha ma'lumot:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length > 2500) return ctx.reply("Matn 1–2500 belgi bo'lsin.");
    ctx.wizard.state.e.description = t;
    await ctx.reply("Sana va vaqt (format: <code>25.12.2026 14:30</code>):", H);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const d = parseDate(getText(ctx));
    if (!d) return ctx.reply("Format noto'g'ri. Masalan: 25.12.2026 14:30");
    if (d < new Date()) return ctx.reply("Sana kelajakda bo'lishi kerak.");
    ctx.wizard.state.e.date = d.toISOString();
    await ctx.reply("Manzil (yoki «Onlayn» + havola):");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length > 300) return ctx.reply("Manzil 1–300 belgi bo'lsin.");
    ctx.wizard.state.e.location = t;
    await ctx.reply("👀 Ko'rinishi:\n\n" + n.eventText({ ...ctx.wizard.state.e, participants: [] }), H);
    await ctx.reply("Nima qilamiz?", kb.publish());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = getText(ctx);
    if (t !== kb.BTN.PUBLISH_ALL && t !== kb.BTN.SAVE_ONLY) return ctx.reply("Tugmalardan birini tanlang.");
    const e = db.addEvent({ ...ctx.wizard.state.e, authorId: ctx.from.id });
    await leaveToMenu(ctx, `✅ Tadbir #${e.id} saqlandi (${fmtDate(e.date)}).`);
    if (t === kb.BTN.PUBLISH_ALL) {
      await ctx.reply("📣 Tarqatilmoqda...");
      const r = await n.broadcast((id) =>
        ctx.telegram.sendMessage(id, "🔔 <b>Yangi tadbir!</b>\n\n" + n.eventText(e), { ...H, ...n.eventButtons(e, id) })
      );
      await ctx.reply(`📣 Yuborildi: ${r.ok}/${r.total}. Xato: ${r.fail}`, kb.adminMenu());
    } else {
      await ctx.reply("Admin panel", kb.adminMenu());
    }
  }
);
withCancel(eventScene);

/* ============ 4. Hammaga xabar ============ */
const broadcastScene = new Scenes.WizardScene(
  "broadcast",
  async (ctx) => {
    await ctx.reply(
      "📣 Barcha foydalanuvchilarga yuboriladigan xabarni yuboring (matn, rasm, video, fayl — istalgan ko'rinishda):",
      kb.cancel()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message) return;
    ctx.wizard.state.src = { chatId: ctx.chat.id, messageId: ctx.message.message_id };
    const count = db.allUsers().filter((u) => !u.blocked).length;
    await ctx.reply(`Ushbu xabar <b>${count}</b> ta foydalanuvchiga yuboriladi. Tasdiqlaysizmi?`, { ...H, ...kb.confirm() });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (getText(ctx) !== kb.BTN.SEND) return ctx.reply("«Yuborish» yoki «Bekor qilish» ni bosing.");
    const { chatId, messageId } = ctx.wizard.state.src;
    await leaveToMenu(ctx, "📣 Tarqatish boshlandi...");
    const r = await n.broadcast((id) => ctx.telegram.copyMessage(id, chatId, messageId));
    await ctx.reply(`✅ Tugadi. Yuborildi: ${r.ok}/${r.total}. Xato: ${r.fail}`, kb.adminMenu());
  }
);
withCancel(broadcastScene);

module.exports = { adminText, newsScene, eventScene, broadcastScene };
