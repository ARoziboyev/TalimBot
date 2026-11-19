// Loyiha taklifi yuborish
const { Scenes } = require("telegraf");
const db = require("../db");
const kb = require("../keyboards");
const { getText, CATEGORIES } = require("../utils");
const { proposalCard, notifyNewProposal } = require("../notify");
const { withCancel, leaveToMenu } = require("./common");

const H = { parse_mode: "HTML" };

const scene = new Scenes.WizardScene(
  "proposal",

  // 0 — yo'nalish
  async (ctx) => {
    ctx.wizard.state.p = {};
    await ctx.reply(
      "💡 <b>Loyiha taklifi</b>\n\nTaklifingiz qo'mita mutaxassislari tomonidan ko'rib chiqiladi va natijasi sizga shu bot orqali yuboriladi.\n\n<b>1/5.</b> Taklif qaysi yo'nalishga tegishli?",
      { ...H, ...kb.grid(CATEGORIES) }
    );
    return ctx.wizard.next();
  },

  // 1 — nomi
  async (ctx) => {
    const t = getText(ctx);
    if (!CATEGORIES.includes(t)) return ctx.reply("Iltimos, tugmalardan birini tanlang.");
    ctx.wizard.state.p.category = t;
    await ctx.reply("<b>2/5.</b> Loyiha nomini yozing (5–120 belgi):", { ...H, ...kb.cancel() });
    return ctx.wizard.next();
  },

  // 2 — tavsif
  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length < 5 || t.length > 120) return ctx.reply("Nom 5–120 belgi oralig'ida bo'lishi kerak.");
    ctx.wizard.state.p.title = t;
    await ctx.reply(
      "<b>3/5.</b> Loyihani batafsil tavsiflang (20–2500 belgi):\n\n• Qanday muammoni hal qiladi?\n• Qanday amalga oshiriladi?\n• Kimlar uchun mo'ljallangan?",
      H
    );
    return ctx.wizard.next();
  },

  // 3 — natija / byudjet
  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length < 20) return ctx.reply("Tavsif kamida 20 belgidan iborat bo'lishi kerak.");
    if (t.length > 2500) return ctx.reply(`Tavsif juda uzun (${t.length}). Iltimos, 2500 belgigacha qisqartiring.`);
    ctx.wizard.state.p.description = t;
    await ctx.reply("<b>4/5.</b> Kutilayotgan natija va taxminiy byudjet (ixtiyoriy):", { ...H, ...kb.skipCancel() });
    return ctx.wizard.next();
  },

  // 4 — ilova
  async (ctx) => {
    const t = getText(ctx);
    if (!t) return ctx.reply("Matn yozing yoki «O'tkazib yuborish» ni bosing.");
    if (t !== kb.BTN.SKIP) {
      if (t.length > 1000) return ctx.reply("Iltimos, 1000 belgigacha yozing.");
      ctx.wizard.state.p.result = t;
    }
    await ctx.reply(
      "<b>5/5.</b> Qo'shimcha fayl yuboring (taqdimot, PDF, Word yoki rasm) — ixtiyoriy:",
      { ...H, ...kb.skipCancel() }
    );
    return ctx.wizard.next();
  },

  // 5 — ko'rib chiqish
  async (ctx) => {
    const m = ctx.message || {};
    const p = ctx.wizard.state.p;
    if (m.document) {
      if (m.document.file_size > 20 * 1024 * 1024) return ctx.reply("Fayl hajmi 20 MB dan oshmasligi kerak.");
      p.file = { type: "document", fileId: m.document.file_id, name: m.document.file_name };
    } else if (m.photo) {
      p.file = { type: "photo", fileId: m.photo[m.photo.length - 1].file_id, name: "rasm" };
    } else if (getText(ctx) !== kb.BTN.SKIP) {
      return ctx.reply("Fayl/rasm yuboring yoki «O'tkazib yuborish» ni bosing.");
    }

    const preview = proposalCard({ ...p, id: "—", status: "new", userId: ctx.from.id, createdAt: new Date() }, { forAdmin: false });
    await ctx.reply("👀 <b>Taklifingizni tekshiring:</b>\n\n" + preview, { ...H, ...kb.confirm() });
    return ctx.wizard.next();
  },

  // 6 — yuborish
  async (ctx) => {
    if (getText(ctx) !== kb.BTN.SEND) return ctx.reply("«Yuborish» yoki «Bekor qilish» tugmasini bosing.");
    const saved = db.addProposal({ ...ctx.wizard.state.p, userId: ctx.from.id });
    await notifyNewProposal(ctx.telegram, saved);
    await ctx.reply(
      `✅ Taklifingiz qabul qilindi!\n\n🔖 Raqami: <b>#${saved.id}</b>\nHolatini «${kb.BTN.MY}» bo'limida kuzatishingiz mumkin. Javob shu botga keladi.`,
      H
    );
    return leaveToMenu(ctx, "Asosiy menyu 👇");
  }
);

module.exports = withCancel(scene);
