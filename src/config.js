require("dotenv").config();

process.env.TZ = process.env.TZ || "Asia/Tashkent";

const ADMIN_IDS = (process.env.ADMIN_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number);

const config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_IDS,
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID ? Number(process.env.ADMIN_CHAT_ID) : null,
  ORG_NAME: process.env.ORG_NAME || "Ta'lim qo'mitasi",
  CONTACT_PHONE: process.env.CONTACT_PHONE || "",
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || "",
  CONTACT_ADDRESS: process.env.CONTACT_ADDRESS || "",
  WEBSITE: process.env.WEBSITE || "",
  DAILY_PROPOSAL_LIMIT: Number(process.env.DAILY_PROPOSAL_LIMIT || 3),
};

config.isAdmin = (id) => ADMIN_IDS.includes(Number(id));

module.exports = config;
