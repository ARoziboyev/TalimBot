// Adminlarga xabar yuborish, kartochkalar va ommaviy tarqatish
const { Markup } = require("telegraf");
const config = require("./config");
const db = require("./db");
const { esc, fmtDate, sleep, STATUS } = require("./utils");

const adminTargets = () => (config.ADMIN_CHAT_ID ? [config.ADMIN_CHAT_ID] : config.ADMIN_IDS);

async function toAdmins(telegram, fn) {
  const sent = [];
  for (const chatId of adminTargets()) {
    try {
      sent.push(await fn(chatId));
    } catch (e) {
      console.error(`Adminga (${chatId}) yuborib bo'lmadi:`, e.message);
    }
  }
  return sent;
}

/* ---------------- Taklif kartochkasi ---------------- */
function proposalCard(p, { forAdmin = true } = {}) {
  const u = db.getUser(p.userId) || {};
  const lines = [
    `💡 <b>Taklif #${p.id}</b> — ${STATUS[p.status]}`,
    "",
    `📁 <b>Yo'nalish:</b> ${esc(p.category)}`,
    `📌 <b>Nomi:</b> ${esc(p.title)}`,
    `📝 <b>Tavsif:</b>\n${esc(p.description)}`,
  ];
  if (p.result) lines.push(`🎯 <b>Kutilayotgan natija / byudjet:</b>\n${esc(p.result)}`);
  if (p.file) lines.push(`📎 Ilova: ${esc(p.file.name || p.file.type)}`);
  if (p.rejectReason) lines.push(`\n❗️ <b>Rad etish sababi:</b> ${esc(p.rejectReason)}`);
  if (p.adminNote) lines.push(`\n💬 <b>Qo'mita izohi:</b> ${esc(p.adminNote)}`);
  if (forAdmin) {
    lines.push(
      "",
      `👤 ${esc(u.fullName || u.firstName)} — ${esc(u.role || "")}, ${esc(u.region || "")}`,
      `📞 ${esc(u.phone || "—")}${u.username ? " · @" + esc(u.username) : ""} · ID: <code>${p.userId}</code>`
    );
  }
  lines.push(`🕒 ${fmtDate(p.createdAt)}`);
  return lines.join("\n");
}

function proposalButtons(p) {
  const rows = [];
  if (p.status === "new") rows.push([Markup.button.callback("🔍 Ko'rib chiqishga olish", `p:review:${p.id}`)]);
  if (p.status === "new" || p.status === "review") {
    rows.push([
      Markup.button.callback("✅ Qabul qilish", `p:approve:${p.id}`),
      Markup.button.callback("❌ Rad etish", `p:reject:${p.id}`),
    ]);
  }
  rows.push([Markup.button.callback("💬 Muallifga yozish", `p:msg:${p.id}`)]);
  return Markup.inlineKeyboard(rows);
}

async function sendFile(telegram, chatId, file, caption) {
  if (!file) return;
  if (file.type === "photo") return telegram.sendPhoto(chatId, file.fileId, { caption });
  return telegram.sendDocument(chatId, file.fileId, { caption });
}

async function notifyNewProposal(telegram, p) {
  await toAdmins(telegram, async (chatId) => {
    const msg = await telegram.sendMessage(chatId, "🔔 <b>Yangi loyiha taklifi!</b>\n\n" + proposalCard(p), {
      parse_mode: "HTML",
      ...proposalButtons(p),
    });
    await sendFile(telegram, chatId, p.file, `📎 Taklif #${p.id} ilovasi`);
    return msg;
  });
}

/* ---------------- Savol kartochkasi ---------------- */
function questionCard(q) {
  const u = db.getUser(q.userId) || {};
  return [
    `❓ <b>Murojaat #${q.id}</b>${q.answered ? " — ✅ javob berilgan" : ""}`,
    "",
    esc(q.text),
    "",
    `👤 ${esc(u.fullName || u.firstName)} — ${esc(u.role || "")}, ${esc(u.region || "")}`,
    `📞 ${esc(u.phone || "—")}${u.username ? " · @" + esc(u.username) : ""}`,
    `🕒 ${fmtDate(q.createdAt)}`,
    q.answer ? `\n✍️ <b>Javob:</b> ${esc(q.answer)}` : "",
  ].join("\n");
}

const questionButtons = (q) =>
  q.answered ? Markup.inlineKeyboard([]) : Markup.inlineKeyboard([[Markup.button.callback("✍️ Javob berish", `q:ans:${q.id}`)]]);

async function notifyNewQuestion(telegram, q) {
  await toAdmins(telegram, (chatId) =>
    telegram.sendMessage(chatId, "🔔 <b>Yangi murojaat!</b>\n\n" + questionCard(q), {
      parse_mode: "HTML",
      ...questionButtons(q),
    })
  );
}

/* ---------------- Yangilik va tadbir ---------------- */
function newsText(n) {
  return `📰 <b>${esc(n.title)}</b>\n\n${esc(n.body)}\n\n🕒 ${fmtDate(n.createdAt)}`;
}

async function sendNews(telegram, chatId, n, extra = {}) {
  const text = newsText(n);
  if (n.photo) {
    if (text.length <= 1000) return telegram.sendPhoto(chatId, n.photo, { caption: text, parse_mode: "HTML", ...extra });
    await telegram.sendPhoto(chatId, n.photo);
  }
  return telegram.sendMessage(chatId, text, { parse_mode: "HTML", ...extra });
}

function eventText(e) {
  return [
    `📅 <b>${esc(e.title)}</b>`,
    "",
    esc(e.description),
    "",
    `🗓 <b>Sana:</b> ${fmtDate(e.date)}`,
    `📍 <b>Manzil:</b> ${esc(e.location)}`,
    `👥 <b>Ro'yxatdan o'tganlar:</b> ${e.participants.length}`,
  ].join("\n");
}

function eventButtons(e, uid, isAdmin = false) {
  const registered = e.participants.includes(uid);
  const rows = [
    [Markup.button.callback(registered ? "❎ Ro'yxatdan chiqish" : "✍️ Ro'yxatdan o'tish", `e:reg:${e.id}`)],
  ];
  if (isAdmin) rows.push([Markup.button.callback("👥 Qatnashchilar ro'yxati", `e:who:${e.id}`)]);
  return Markup.inlineKeyboard(rows);
}

/* ---------------- Ommaviy tarqatish ---------------- */
// send(chatId) — har bir foydalanuvchiga nima yuborishni belgilaydi
async function broadcast(send) {
  const users = db.allUsers().filter((u) => !u.blocked);
  let ok = 0;
  let fail = 0;
  for (const u of users) {
    try {
      await send(u.id);
      ok++;
    } catch (e) {
      fail++;
      if (e.code === 403) db.markBlocked(u.id);
      if (e.code === 429 && e.parameters?.retry_after) await sleep(e.parameters.retry_after * 1000);
    }
    await sleep(45); // Telegram cheklovi: ~30 xabar/soniya
  }
  return { ok, fail, total: users.length };
}

module.exports = {
  adminTargets, toAdmins, sendFile,
  proposalCard, proposalButtons, notifyNewProposal,
  questionCard, questionButtons, notifyNewQuestion,
  newsText, sendNews, eventText, eventButtons,
  broadcast,
};
