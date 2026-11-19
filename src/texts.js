const config = require("./config");
const { esc } = require("./utils");

module.exports = {
  welcomeNew: (name) =>
    `Assalomu alaykum, <b>${esc(name)}</b>! 👋\n\n<b>${esc(config.ORG_NAME)}</b> rasmiy botiga xush kelibsiz.\n\nBu yerda siz:\n💡 ta'lim sohasini rivojlantirish bo'yicha loyiha takliflaringizni yuborishingiz,\n❓ savol va murojaatlar yo'llashingiz,\n📰 yangiliklardan xabardor bo'lishingiz,\n📅 tadbirlarga ro'yxatdan o'tishingiz mumkin.\n\nBoshlash uchun qisqa ro'yxatdan o'ting 👇`,

  welcomeBack: (name) => `Xush kelibsiz, <b>${esc(name)}</b>! 👋\nQuyidagi menyudan kerakli bo'limni tanlang.`,

  about: () =>
    `ℹ️ <b>${esc(config.ORG_NAME)}</b>\n\n` +
    `Qo'mitaning asosiy vazifalari:\n` +
    `• ta'lim sifatini oshirish bo'yicha tashabbuslarni qo'llab-quvvatlash;\n` +
    `• yoshlar, o'qituvchilar va ota-onalarning takliflarini o'rganish;\n` +
    `• raqamli va inklyuziv ta'limni rivojlantirish;\n` +
    `• ta'lim muassasalari infratuzilmasini yaxshilash.\n\n` +
    `💡 Sizning g'oyangiz ham ta'limni o'zgartirishi mumkin — loyihangizni taklif qiling!`,

  contact: () => {
    const lines = [`📞 <b>Aloqa</b>\n`];
    if (config.CONTACT_PHONE) lines.push(`☎️ Telefon: ${esc(config.CONTACT_PHONE)}`);
    if (config.CONTACT_EMAIL) lines.push(`✉️ Email: ${esc(config.CONTACT_EMAIL)}`);
    if (config.CONTACT_ADDRESS) lines.push(`📍 Manzil: ${esc(config.CONTACT_ADDRESS)}`);
    if (config.WEBSITE) lines.push(`🌐 Sayt: ${esc(config.WEBSITE)}`);
    lines.push(`\n🕘 Ish vaqti: Du–Ju, 09:00–18:00`);
    lines.push(`\nSavolingiz bo'lsa, «❓ Savol / Murojaat» bo'limidan yozing.`);
    return lines.join("\n");
  },

  help:
    `🤖 <b>Bot buyruqlari</b>\n\n` +
    `/start — botni ishga tushirish\n` +
    `/menu — asosiy menyu\n` +
    `/cancel — joriy amalni bekor qilish\n` +
    `/help — yordam\n\n` +
    `💡 <b>Loyiha taklif qilish</b> — 5 bosqichda taklif yuborasiz, holatini «Mening takliflarim» bo'limida kuzatasiz.\n` +
    `❓ <b>Savol / Murojaat</b> — javob shu botga keladi.\n` +
    `📅 <b>Tadbirlar</b> — ro'yxatdan o'tsangiz, tadbirdan bir kun oldin eslatma olasiz.`,
};
