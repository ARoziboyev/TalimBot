const { Telegraf, Scenes, session } = require("telegraf");
const config = require("./config");
const db = require("./db");
const kb = require("./keyboards");

const registerScene = require("./scenes/register");
const proposalScene = require("./scenes/proposal");
const questionScene = require("./scenes/question");
const { adminText, newsScene, eventScene, broadcastScene } = require("./scenes/admin");
const registerCallbacks = require("./handlers/callbacks");
const registerUser = require("./handlers/user");
const registerAdmin = require("./handlers/admin");

function createBot(token) {
  const bot = new Telegraf(token);
  const stage = new Scenes.Stage([
    registerScene, proposalScene, questionScene,
    adminText, newsScene, eventScene, broadcastScene,
  ]);

  // Muhim: stage handlerlari stage.middleware() chaqirilishidan OLDIN ulanadi
  registerCallbacks(stage);

  bot.use(session());
  bot.use((ctx, next) => {
    if (ctx.from && ctx.chat?.type === "private") db.touchUser(ctx.from);
    return next();
  });
  bot.use(stage.middleware());

  registerUser(bot);
  registerAdmin(bot);

  // Tanilmagan xabarlar
  bot.on("message", (ctx) => {
    if (ctx.chat.type !== "private") return;
    return ctx.reply("Iltimos, quyidagi menyudan tanlang 👇", kb.mainMenu(config.isAdmin(ctx.from.id)));
  });

  bot.catch((err, ctx) => {
    console.error(`Xato [${ctx.updateType}]:`, err);
    if (ctx.chat?.type === "private") ctx.reply("⚠️ Kutilmagan xatolik yuz berdi. /menu orqali qayta urinib ko'ring.").catch(() => {});
  });
  return bot;
}

module.exports = { createBot };
