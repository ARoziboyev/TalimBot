const config = require("../config");
const kb = require("../keyboards");

// Sahnadan chiqib, tegishli menyuni ko'rsatish
async function leaveToMenu(ctx, text = "Asosiy menyu") {
  await ctx.scene.leave();
  if (ctx.chat?.type !== "private") {
    return ctx.reply(text, { reply_markup: { remove_keyboard: true } });
  }
  return ctx.reply(text, kb.mainMenu(config.isAdmin(ctx.from.id)));
}

// Har bir sahnaga "Bekor qilish" tugmasini ulash
function withCancel(scene) {
  scene.hears(kb.BTN.CANCEL, (ctx) => leaveToMenu(ctx, "❌ Bekor qilindi."));
  scene.command("cancel", (ctx) => leaveToMenu(ctx, "❌ Bekor qilindi."));
  return scene;
}

module.exports = { leaveToMenu, withCancel };
