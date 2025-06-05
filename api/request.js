const express = require('express');
const router = express.Router();
const { getSheetsClient, SHEET_ID } = require('./_googleSheet');

const SHEET_NAME = 'requests';

// --- Helper functions ---
async function getRequests() {
  try {
    const sheets = await getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
    });
    const [header, ...rows] = resp.data.values || [];
    if (!header) return [];
    return rows.map(row => {
      const req = {};
      header.forEach((key, i) => req[key] = row[i]);
      return req;
    });
  } catch (err) {
    throw new Error('Không thể lấy dữ liệu request: ' + err.message);
  }
}

async function appendRequest(data) {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [data] }
    });
  } catch (err) {
    throw new Error('Không thể ghi request: ' + err.message);
  }
}

// --- API endpoints ---
router.get('/', async (req, res) => {
  try {
    const { username } = req.query;
    const requests = await getRequests();
    if (username) {
      const filtered = requests.filter(r => (r.username || '').toLowerCase() === username.toLowerCase());
      return res.status(200).json(filtered);
    }
    return res.status(200).json(requests);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, type, amount, bank_code = "", note = "" } = req.body;
    if (!username || !type || !amount) return res.status(400).json({ error: "Thiếu thông tin." });
    await appendRequest([
      new Date().toISOString(),
      username,
      type,
      amount,
      "pending",
      bank_code,
      note
    ]);
    return res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.all('/', (req, res) => {
  res.status(405).json({ error: "Phương thức không hỗ trợ." });
});

module.exports = router;
