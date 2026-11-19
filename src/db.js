// Oddiy JSON-fayl ma'lumotlar bazasi (data/db.json).
// Kichik va o'rta hajmdagi bot uchun yetarli; kerak bo'lsa keyinchalik PostgreSQL/Supabase ga o'tkazish oson.
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "data");
const FILE = path.join(DIR, "db.json");

const DEFAULT = () => ({
  users: {},
  proposals: [],
  questions: [],
  news: [],
  events: [],
  seq: { proposal: 0, question: 0, news: 0, event: 0 },
});

let data = DEFAULT();

function load() {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(FILE)) {
    try {
      data = { ...DEFAULT(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
    } catch (e) {
      console.error("db.json o'qib bo'lmadi, zaxira nusxa olinadi:", e.message);
      fs.copyFileSync(FILE, FILE + ".broken-" + Date.now());
      data = DEFAULT();
    }
  }
  save();
}

function save() {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

const nextId = (key) => (data.seq[key] = (data.seq[key] || 0) + 1);
const now = () => new Date().toISOString();

/* ---------------- Foydalanuvchilar ---------------- */
function touchUser(from) {
  let u = data.users[from.id];
  let changed = false;
  if (!u) {
    u = data.users[from.id] = {
      id: from.id,
      username: from.username || null,
      firstName: from.first_name || "",
      registered: false,
      blocked: false,
      joinedAt: now(),
    };
    changed = true;
  } else {
    if (u.username !== (from.username || null)) {
      u.username = from.username || null;
      changed = true;
    }
    if (u.blocked) {
      u.blocked = false;
      changed = true;
    }
  }
  if (changed) save();
  return u;
}
const getUser = (id) => data.users[id] || null;
function updateUser(id, patch) {
  if (!data.users[id]) return null;
  Object.assign(data.users[id], patch);
  save();
  return data.users[id];
}
const allUsers = () => Object.values(data.users);
const markBlocked = (id) => updateUser(id, { blocked: true });

/* ---------------- Takliflar ---------------- */
function addProposal(p) {
  const item = { id: nextId("proposal"), ...p, status: "new", createdAt: now(), updatedAt: now(), history: [] };
  data.proposals.push(item);
  save();
  return item;
}
const getProposal = (id) => data.proposals.find((p) => p.id === Number(id)) || null;
function updateProposal(id, patch, byAdmin) {
  const p = getProposal(id);
  if (!p) return null;
  if (patch.status && patch.status !== p.status) {
    p.history.push({ from: p.status, to: patch.status, by: byAdmin || null, at: now() });
  }
  Object.assign(p, patch, { updatedAt: now() });
  save();
  return p;
}
const userProposals = (uid) => data.proposals.filter((p) => p.userId === uid).sort((a, b) => b.id - a.id);
const proposalsByStatus = (statuses) => data.proposals.filter((p) => statuses.includes(p.status));
const allProposals = () => data.proposals;
function countUserProposalsToday(uid) {
  const today = new Date().toDateString();
  return data.proposals.filter((p) => p.userId === uid && new Date(p.createdAt).toDateString() === today).length;
}

/* ---------------- Savollar / murojaatlar ---------------- */
function addQuestion(q) {
  const item = { id: nextId("question"), ...q, answered: false, answer: null, createdAt: now() };
  data.questions.push(item);
  save();
  return item;
}
const getQuestion = (id) => data.questions.find((q) => q.id === Number(id)) || null;
function updateQuestion(id, patch) {
  const q = getQuestion(id);
  if (!q) return null;
  Object.assign(q, patch);
  save();
  return q;
}
const unansweredQuestions = () => data.questions.filter((q) => !q.answered);

/* ---------------- Yangiliklar ---------------- */
function addNews(n) {
  const item = { id: nextId("news"), ...n, createdAt: now() };
  data.news.push(item);
  save();
  return item;
}
const latestNews = (n = 5) => [...data.news].sort((a, b) => b.id - a.id).slice(0, n);
function deleteNews(id) {
  const before = data.news.length;
  data.news = data.news.filter((x) => x.id !== Number(id));
  save();
  return data.news.length < before;
}

/* ---------------- Tadbirlar ---------------- */
function addEvent(e) {
  const item = { id: nextId("event"), ...e, participants: [], reminded: false, createdAt: now() };
  data.events.push(item);
  save();
  return item;
}
const getEvent = (id) => data.events.find((e) => e.id === Number(id)) || null;
const upcomingEvents = () =>
  data.events.filter((e) => new Date(e.date) > new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));
function toggleEventReg(id, uid) {
  const e = getEvent(id);
  if (!e) return null;
  const i = e.participants.indexOf(uid);
  if (i >= 0) e.participants.splice(i, 1);
  else e.participants.push(uid);
  save();
  return i < 0; // true => ro'yxatdan o'tdi
}
function updateEvent(id, patch) {
  const e = getEvent(id);
  if (!e) return null;
  Object.assign(e, patch);
  save();
  return e;
}
function deleteEvent(id) {
  const before = data.events.length;
  data.events = data.events.filter((x) => x.id !== Number(id));
  save();
  return data.events.length < before;
}

/* ---------------- Statistika ---------------- */
function stats() {
  const users = allUsers();
  const byStatus = { new: 0, review: 0, approved: 0, rejected: 0 };
  const byCategory = {};
  const byRegion = {};
  for (const p of data.proposals) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    const r = data.users[p.userId]?.region || "Noma'lum";
    byRegion[r] = (byRegion[r] || 0) + 1;
  }
  const weekAgo = Date.now() - 7 * 864e5;
  return {
    users: users.length,
    registered: users.filter((u) => u.registered).length,
    blocked: users.filter((u) => u.blocked).length,
    newUsersWeek: users.filter((u) => new Date(u.joinedAt) > weekAgo).length,
    proposals: data.proposals.length,
    proposalsWeek: data.proposals.filter((p) => new Date(p.createdAt) > weekAgo).length,
    byStatus,
    byCategory,
    byRegion,
    questions: data.questions.length,
    unanswered: unansweredQuestions().length,
    news: data.news.length,
    events: data.events.length,
    upcoming: upcomingEvents().length,
  };
}

module.exports = {
  load, save,
  touchUser, getUser, updateUser, allUsers, markBlocked,
  addProposal, getProposal, updateProposal, userProposals, proposalsByStatus, allProposals, countUserProposalsToday,
  addQuestion, getQuestion, updateQuestion, unansweredQuestions,
  addNews, latestNews, deleteNews,
  addEvent, getEvent, upcomingEvents, toggleEventReg, updateEvent, deleteEvent,
  stats,
};
