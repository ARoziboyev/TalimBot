const config = require("./config");
const db = require("./db");
const n = require("./notify");
const { createBot } = require("./bot");

if (!config.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi. .env faylini to'ldiring (namuna: .env.example).");
  process.exit(1);
}
if (!config.ADMIN_IDS.length) console.warn("⚠️ ADMIN_IDS bo'sh — admin panel hech kimga ochilmaydi.");

db.load();
const bot = createBot(config.BOT_TOKEN);

/* ---------- Tadbir eslatmalari: boshlanishiga 24 soat qolganda ---------- */
async function sendReminders() {
  const soon = Date.now() + 24 * 3600 * 1000;
  for (const e of db.upcomingEvents()) {
    if (e.reminded || new Date(e.date).getTime() > soon) continue;
    db.updateEvent(e.id, { reminded: true });
    for (const uid of e.participants) {
      try {
        await bot.telegram.sendMessage(uid, `⏰ <b>Eslatma!</b> Ertaga tadbir bor:\n\n${n.eventText(e)}`, { parse_mode: "HTML" });
      } catch (err) {
        if (err.code === 403) db.markBlocked(uid);
      }
    }
    console.log(`Eslatma yuborildi: tadbir #${e.id} (${e.title})`);
  }
}

/* ---------- Ishga tushirish ---------- */
(async () => {
  await bot.telegram.setMyCommands([
    { command: "start", description: "Botni ishga tushirish" },
    { command: "menu", description: "Asosiy menyu" },
    { command: "cancel", description: "Amalni bekor qilish" },
    { command: "help", description: "Yordam" },
  ]);
  setInterval(() => sendReminders().catch(console.error), 10 * 60 * 1000);
  sendReminders().catch(console.error);

  bot.launch({ dropPendingUpdates: false });
  const me = await bot.telegram.getMe();
  console.log(`✅ @${me.username} ishga tushdi`);
})().catch((e) => {
  console.error("Ishga tushirishda xato:", e.message);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
