# Ta'lim qo'mitasi — Telegram bot (Node.js + Telegraf)

## Imkoniyatlar

**Foydalanuvchilar uchun**
- 📝 Ro'yxatdan o'tish: ism, maqom (o'quvchi, talaba, o'qituvchi, ota-ona...), hudud, telefon
- 💡 **Loyiha taklif qilish**: 5 bosqich (yo'nalish → nom → tavsif → natija/byudjet → fayl/rasm), yuborishdan oldin ko'rib chiqish
- 📂 **Mening takliflarim**: har bir taklifning holati (🆕 Yangi / 🔍 Ko'rib chiqilmoqda / ✅ Qabul qilindi / ❌ Rad etildi)
- 🔔 Holat o'zgarganda avtomatik xabar keladi (rad etilsa, sababi bilan)
- ❓ Savol / murojaat yuborish, javob shu botga keladi
- 📰 Yangiliklar, 📅 Tadbirlar (ro'yxatdan o'tish va 24 soat oldin eslatma)
- 👤 Profil, ℹ️ Biz haqimizda, 📞 Aloqa
- Spamdan himoya: kuniga ko'pi bilan N ta taklif

**Adminlar uchun** (`🛠 Admin panel` yoki `/admin`)
- 📥 Yangi takliflar: kartochkadagi tugmalar orqali ko'rib chiqishga olish, qabul qilish, sababini yozib rad etish yoki muallifga yozish
- 💬 Javobsiz murojaatlarga javob berish
- 📰 Yangilik va 📅 tadbir qo'shish (xohlasangiz hammaga tarqatiladi)
- 🗂 Yangilik/tadbirlarni o'chirish, tadbir qatnashchilari ro'yxati
- 📣 Hammaga xabar (matn, rasm, video, fayl)
- 📊 Statistika (holat, yo'nalish va hudud bo'yicha)
- 📤 Barcha takliflarni CSV qilib yuklab olish (Excel'da ochiladi)

## O'rnatish

1. Node.js 18 yoki undan yangi versiyasini o'rnating.
2. @BotFather orqali bot yarating va token oling.
3. Loyiha papkasida:
   ```bash
   npm install
   cp .env.example .env     # Windows: copy .env.example .env
   ```
4. `.env` faylini to'ldiring:
   - `BOT_TOKEN` — BotFather bergan token
   - `ADMIN_IDS` — adminlarning ID raqamlari (ID ni @userinfobot ko'rsatadi)
   - `ADMIN_CHAT_ID` *(ixtiyoriy)* — takliflar bitta admin guruhga tushishi uchun. Botni guruhga qo'shib, guruhda `/chatid` yozing. **Guruhdagi tugmalarni faqat `ADMIN_IDS` ro'yxatidagilar bosa oladi.**
   - Aloqa ma'lumotlari, kunlik limit
5. Ishga tushiring:
   ```bash
   npm start
   ```

## Serverda doimiy ishlatish (pm2)
```bash
npm i -g pm2
pm2 start src/index.js --name talim-bot
pm2 save && pm2 startup
```

## Tuzilishi
```
src/
  index.js            — ishga tushirish, tadbir eslatmalari
  bot.js              — bot va sahnalarni yig'ish
  config.js           — .env sozlamalari
  db.js               — ma'lumotlar bazasi (data/db.json)
  keyboards.js        — tugmalar
  notify.js           — kartochkalar, adminlarga xabar, tarqatish
  texts.js            — matnlar (Biz haqimizda, Aloqa, Yordam)
  utils.js            — yo'nalishlar, hududlar, maqomlar, yordamchi funksiyalar
  handlers/
    callbacks.js      — /start, /admin, inline tugmalar
    user.js           — foydalanuvchi menyusi
    admin.js          — admin panel
  scenes/
    register.js       — ro'yxatdan o'tish
    proposal.js       — loyiha taklifi
    question.js       — savol/murojaat
    admin.js          — javob, yangilik, tadbir, tarqatish
```

## Moslashtirish
- Taklif yo'nalishlari, hududlar va maqomlar: `src/utils.js` (`CATEGORIES`, `REGIONS`, `ROLES`)
- "Biz haqimizda" va "Aloqa" matnlari: `src/texts.js`
- Ma'lumotlar `data/db.json` faylida saqlanadi, undan muntazam zaxira nusxa oling.
