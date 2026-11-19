// Savol / murojaat yuborish
const { Scenes } = require("telegraf");
const db = require("../db");
const kb = require("../keyboards");
const { getText } = require("../utils");
const { notifyNewQuestion } = require("../notify");
const { withCancel, leaveToMenu } = require("./common");

const scene = new Scenes.WizardScene(
  "question",
  async (ctx) => {
    await ctx.reply(
      "❓ <b>Savol yoki murojaat</b>\n\nSavolingiz, shikoyat yoki fikringizni bitta xabarda batafsil yozing. Qo'mita mutaxassislari javobni shu botga yuborishadi.",
      { parse_mode: "HTML", ...kb.cancel() }
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length < 10) return ctx.reply("Iltimos, savolingizni kamida 10 belgida matn ko'rinishida yozing.");
    if (t.length > 3000) return ctx.reply("Matn juda uzun. 3000 belgigacha qisqartiring.");
    const q = db.addQuestion({ userId: ctx.from.id, text: t });
    await notifyNewQuestion(ctx.telegram, q);
    await ctx.reply(`✅ Murojaatingiz qabul qilindi (#${q.id}). Tez orada javob beramiz.`);
    return leaveToMenu(ctx, "Asosiy menyu 👇");
  }
);

module.exports = withCancel(scene);
