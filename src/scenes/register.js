// Ro'yxatdan o'tish: ism, maqom, hudud, telefon
const { Scenes } = require("telegraf");
const db = require("../db");
const kb = require("../keyboards");
const { getText, ROLES, REGIONS, esc } = require("../utils");
const { withCancel, leaveToMenu } = require("./common");

const PHONE_RE = /^\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;

const scene = new Scenes.WizardScene(
  "register",

  async (ctx) => {
    await ctx.reply("📝 <b>Ro'yxatdan o'tish</b>\n\n1/4. Ism-familiyangizni kiriting:", {
      parse_mode: "HTML",
      ...kb.cancel(),
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    const t = getText(ctx);
    if (!t || t.length < 3 || t.length > 80) return ctx.reply("Iltimos, ism-familiyangizni to'g'ri kiriting (3–80 belgi).");
    ctx.wizard.state.fullName = t;
    await ctx.reply("2/4. Siz kimsiz?", kb.grid(ROLES));
    return ctx.wizard.next();
  },

  async (ctx) => {
    const t = getText(ctx);
    if (!ROLES.includes(t)) return ctx.reply("Iltimos, tugmalardan birini tanlang.");
    ctx.wizard.state.role = t;
    await ctx.reply("3/4. Hududingizni tanlang:", kb.grid(REGIONS));
    return ctx.wizard.next();
  },

  async (ctx) => {
    const t = getText(ctx);
    if (!REGIONS.includes(t)) return ctx.reply("Iltimos, ro'yxatdan hududni tanlang.");
    ctx.wizard.state.region = t;
    await ctx.reply("4/4. Telefon raqamingizni yuboring (tugmani bosing yoki +998901234567 ko'rinishida yozing):", kb.phone());
    return ctx.wizard.next();
  },

  async (ctx) => {
    let phone = null;
    const contact = ctx.message?.contact;
    if (contact) {
      if (contact.user_id && contact.user_id !== ctx.from.id) return ctx.reply("Iltimos, o'zingizning raqamingizni yuboring.");
      phone = contact.phone_number.startsWith("+") ? contact.phone_number : "+" + contact.phone_number;
    } else {
      const t = getText(ctx);
      if (t && PHONE_RE.test(t)) phone = t.replace(/[\s-]/g, "");
    }
    if (!phone) return ctx.reply("Raqam noto'g'ri. Masalan: +998901234567");

    const { fullName, role, region } = ctx.wizard.state;
    db.updateUser(ctx.from.id, { fullName, role, region, phone, registered: true, registeredAt: new Date().toISOString() });

    await ctx.reply(
      `✅ Rahmat, <b>${esc(fullName)}</b>! Ro'yxatdan o'tdingiz.\n\nEndi qo'mitaga loyiha takliflaringizni yuborishingiz, savol berishingiz va tadbirlarda qatnashishingiz mumkin.`,
      { parse_mode: "HTML" }
    );
    return leaveToMenu(ctx, "Quyidagi menyudan tanlang 👇");
  }
);

module.exports = withCancel(scene);
