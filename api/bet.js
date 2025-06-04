const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const dayjs = require('dayjs');

// Sử dụng biến môi trường để bảo mật thông tin
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const USERS_SHEET = 'users';
const BETS_SHEET = 'bets';

// Middleware: thêm auth Google Sheets vào req
router.use(async (req, res, next) => {
  if (!req.auth) {
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    req.auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  next();
});

// Helper: Lấy data 1 sheet
async function getSheet(auth, sheetName) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  return res.data.values;
}

// Helper: Thêm 1 dòng vào sheet
async function appendSheet(auth, sheetName, row) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });
}

// Helper: Update số dư tài khoản user
async function updateUserBalance(auth, username, delta) {
  const data = await getSheet(auth, USERS_SHEET);
  const header = data[0];
  const idx = data.findIndex(row => row[0] === username);
  if (idx < 0) throw new Error('User not found');
  let balanceIdx = header.indexOf('balance');
  let balance = parseInt(data[idx][balanceIdx] || 0);
  balance += delta;
  if (balance < 0) throw new Error('Không đủ số dư');
  data[idx][balanceIdx] = balance;
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: USERS_SHEET + '!' + `A${idx+1}:E${idx+1}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [data[idx]] },
  });
  return balance;
}

// Đặt cược (trừ tiền ngay)
router.post('/', async (req, res) => {
  const { username, side, amount, round } = req.body;
  const auth = req.auth;
  if (!username || !side || !amount || !round) {
    return res.status(400).json({ error: 'Thiếu dữ liệu đặt cược' });
  }
  try {
    const balance = await updateUserBalance(auth, username, -amount);
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await appendSheet(auth, BETS_SHEET, [
      now, username, side, amount, round, 'pending', '', '', '', ''
    ]);
    res.json({ ok: true, balance });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Lấy lịch sử cược của user
router.get('/history', async (req, res) => {
  const { username } = req.query;
  const auth = req.auth;
  try {
    const data = await getSheet(auth, BETS_SHEET);
    const header = data[0];
    let results = data.slice(1).map(row => {
      let obj = {};
      header.forEach((h, i) => obj[h] = row[i] || '');
      return obj;
    });
    if (username) results = results.filter(r => r.username === username);
    res.json(results);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Lấy toàn bộ lịch sử cược (admin)
router.get('/all', async (req, res) => {
  const auth = req.auth;
  try {
    const data = await getSheet(auth, BETS_SHEET);
    const header = data[0];
    let results = data.slice(1).map(row => {
      let obj = {};
      header.forEach((h, i) => obj[h] = row[i] || '');
      return obj;
    });
    res.json(results);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Kết phiên, xử lý thắng/thua, cộng tiền nếu thắng
router.post('/settle', async (req, res) => {
  const { round, sum, dice1, dice2, dice3 } = req.body;
  const auth = req.auth;
  if (!round || sum === undefined || !dice1 || !dice2 || !dice3) {
    return res.status(400).json({ error: 'Thiếu dữ liệu kết phiên' });
  }
  try {
    const data = await getSheet(auth, BETS_SHEET);
    let changed = [];
    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      if (row[4] == round && row[5] === 'pending') {
        let side = row[2];
        let amount = parseInt(row[3]);
        let username = row[1];
        let isTai = (sum >= 11 && sum <= 17);
        let result = ((side === 'tai' && isTai) || (side === 'xiu' && !isTai)) ? 'win' : 'lose';
        if (result === 'win') {
          await updateUserBalance(auth, username, amount * 2);
        }
        row[5] = result;
        row[6] = sum;
        row[7] = dice1;
        row[8] = dice2;
        row[9] = dice3;
        changed.push({ row, idx: i });
      }
    }
    // Ghi lại các dòng vừa update
    const client = await auth.getClient();
    const sheetsApi = google.sheets({ version: 'v4', auth: client });
    for (const { row, idx } of changed) {
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: BETS_SHEET + '!' + `A${idx+1}:J${idx+1}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [row] }
      });
    }
    res.json({ ok: true, settled: changed.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
