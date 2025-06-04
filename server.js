require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

let serviceAccountKey;
try {
  serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
} catch (e) {
  console.error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY. Must be valid JSON string.');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets('v4');

// Helper: Lấy toàn bộ dữ liệu từ 1 sheet
async function getSheetData(sheetName) {
  const client = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const [header, ...rows] = res.data.values;
  return rows.map(row => {
    let obj = {};
    header.forEach((h, i) => obj[h] = row[i] || '');
    return obj;
  });
}

// Helper: Thêm 1 dòng vào sheet
async function appendSheetData(sheetName, rowObj) {
  const client = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const header = res.data.values[0];
  const row = header.map(h => rowObj[h] || '');
  await sheets.spreadsheets.values.append({
    auth: client,
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] }
  });
}

// USERS - Đăng ký, đăng nhập
app.get('/googleapi/users', async (req, res) => {
  try {
    const { username } = req.query;
    const data = await getSheetData('users');
    res.json(data.filter(u => !username || u.username === username));
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});
app.post('/googleapi/users', async (req, res) => {
  try {
    await appendSheetData('users', req.body);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// REQUESTS - Nạp/Rút
app.get('/googleapi/requests', async (req, res) => {
  try {
    const { username } = req.query;
    const data = await getSheetData('requests');
    res.json(data.filter(r => !username || r.username === username));
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});
app.post('/googleapi/requests', async (req, res) => {
  try {
    await appendSheetData('requests', req.body);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// BETS - Lịch sử cược
app.get('/googleapi/bets/history', async (req, res) => {
  try {
    const { username } = req.query;
    const data = await getSheetData('bets');
    res.json(data.filter(r => !username || r.username === username));
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});
app.get('/googleapi/bets/all', async (req, res) => {
  try {
    const data = await getSheetData('bets');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});
app.post('/googleapi/bets', async (req, res) => {
  try {
    await appendSheetData('bets', req.body);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PATCH balance user
app.patch('/googleapi/users', async (req, res) => {
  try {
    const { username, balance } = req.body;
    const client = await auth.getClient();
    const data = await getSheetData('users');
    const idx = data.findIndex(user => user.username === username);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    // Update balance
    const rowIndex = idx + 2; // +2 vì header là dòng 1
    await sheets.spreadsheets.values.update({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: `users!C${rowIndex}`, // C = balance
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[String(balance)]] }
    });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API server running on port ' + PORT));
