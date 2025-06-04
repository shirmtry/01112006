const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const dayjs = require('dayjs');

// Lấy thông tin từ biến môi trường
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const USERS_SHEET = 'users';
const BETS_SHEET = 'bets';

// Middleware: inject auth Google Sheets vào req
router.use(async (req, res, next) => {
  if (!req.auth) {
    try {
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      req.auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      next();
    } catch (e) {
      return res.status(500).json({ error: 'Lỗi xác thực Google Sheets: ' + e.message });
    }
  } else {
    next();
  }
});

// Helper: lấy toàn bộ dữ liệu 1 sheet, trả về dạng object
async function getSheetData(auth, sheetName) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  const values = res.data.values || [];
  if (values.length === 0) return [];
  const header = values[0];
  return values.slice(1)
    .filter(row => row && row.length > 0 && row.some(cell => cell !== ''))
    .map(row => {
      let obj = {};
      header.forEach((h, i) => obj[h] = row[i] || '');
      return obj;
    });
}

// Helper: thêm 1 dòng vào sheet
async function appendSheetData(auth, sheetName, rowObj) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  // Đảm bảo thứ tự cột theo header
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  const header = res.data.values[0];
  const row = header.map(h => rowObj[h] || '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });
}

// Helper: cập nhật số dư user
async function updateUserBalance(auth, username, delta) {
  const data = await getSheetData(auth, USERS_SHEET);
  const rowIdx = data.findIndex(u => u.username === username);
  if (rowIdx < 0) throw new Error('Không tìm thấy user');
  const balance = parseInt(data[rowIdx].balance || '0', 10);
  const newBalance = balance + delta;
  if (newBalance < 0) throw new Error('Số dư không đủ');
  data[rowIdx].balance = newBalance;
  // Update Google Sheet
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  // Lấy lại header để xác định cột balance (phòng trường hợp header thay đổi)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: USERS_SHEET,
  });
  const header = res.data.values[0];
  const balanceCol = header.indexOf('balance');
  const sheetRow = rowIdx + 2; // Dòng trên sheet (header là dòng 1)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${USERS_SHEET}!${String.fromCharCode(65 + balanceCol)}${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[String(newBalance)]] },
  });
  return newBalance;
}

// API: Đặt cược (trừ tiền ngay)
router.post('/', async (req, res) => {
  const { username, side, amount, round } = req.body;
  const auth = req.auth;
  if (!username || !side || !amount || !round) {
    return res.status(400).json({ error: 'Thiếu dữ liệu đặt cược' });
  }
  try {
    const bal = await updateUserBalance(auth, username, -parseInt(amount,10));
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await appendSheetData(auth, BETS_SHEET, {
      timestamp: now,
      username,
      side,
      amount,
      round,
      result: 'pending',
      sum: '',
      dice1: '',
      dice2: '',
      dice3: ''
    });
    res.json({ ok: true, balance: bal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// API: Lấy lịch sử cược của user
router.get('/history', async (req, res) => {
  const auth = req.auth;
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Thiếu username' });
  try {
    const bets = await getSheetData(auth, BETS_SHEET);
    const result = bets.filter(bet => bet.username === username);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Không tải được lịch sử cược: ' + e.message });
  }
});

// API: Lấy toàn bộ lịch sử cược (admin)
router.get('/all', async (req, res) => {
  const auth = req.auth;
  try {
    const bets = await getSheetData(auth, BETS_SHEET);
    res.json(bets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Settle round (xử lý thắng/thua, cộng tiền nếu thắng)
router.post('/settle', async (req, res) => {
  const { round, sum, dice1, dice2, dice3 } = req.body;
  const auth = req.auth;
  if (!round || sum === undefined || !dice1 || !dice2 || !dice3) {
    return res.status(400).json({ error: 'Thiếu dữ liệu kết phiên' });
  }
  try {
    // Load dữ liệu bets
    const client = await auth.getClient();
    const sheetsApi = google.sheets({ version: 'v4', auth: client });
    const resBets = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: BETS_SHEET,
    });
    const allRows = resBets.data.values || [];
    const header = allRows[0];
    let changed = 0;
    for (let i = 1; i < allRows.length; i++) {
      let row = allRows[i];
      if (row[4] == round && row[5] === 'pending') {
        let side = row[2];
        let amount = parseInt(row[3]);
        let username = row[1];
        let isTai = (sum >= 11 && sum <= 17);
        let result = ((side === 'tai' && isTai) || (side === 'xiu' && !isTai)) ? 'win' : 'lose';
        if (result === 'win') {
          // Cộng lại tiền thắng (tiền thắng = amount * 2, bạn tùy chỉnh nếu muốn)
          await updateUserBalance(auth, username, amount * 2);
        }
        // Update dòng bet
        row[5] = result;
        row[6] = sum;
        row[7] = dice1;
        row[8] = dice2;
        row[9] = dice3;
        // Ghi lại lên Google Sheets
        await sheetsApi.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: BETS_SHEET + '!' + `A${i+1}:J${i+1}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [row] }
        });
        changed++;
      }
    }
    res.json({ ok: true, settled: changed });
  } catch (e) {
    res.status(500).json({ error: 'Không thể settle: ' + e.message });
  }
});

module.exports = router;
