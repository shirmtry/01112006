const express = require('express');
const router = express.Router();
const { getSheetsClient, SHEET_ID } = require('./_googleSheet');

const SHEET_NAME = 'users';

// --- Helper functions ---
async function getUsers() {
  const sheets = await getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });
  const [header, ...rows] = resp.data.values || [];
  if (!header) return [];
  return rows.map(row => {
    const user = {};
    header.forEach((key, i) => user[key] = row[i] || "");
    return user;
  });
}

async function getUserByUsername(username) {
  const users = await getUsers();
  return users.find(u => (u.username || '').toLowerCase() === username.toLowerCase());
}

async function appendUser({ username, passwordHash, balance = 0, ip = "", role = "user" }) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [[username, passwordHash, balance, ip, role]] }
  });
}

async function updateUserFields(username, fields) {
  const sheets = await getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });
  const [header, ...rows] = resp.data.values || [];
  const idx = rows.findIndex(r => (r[0] || '').toLowerCase() === username.toLowerCase());
  if (idx === -1) throw new Error('Không tìm thấy user');
  header.forEach((key, i) => {
    if (fields[key] !== undefined) rows[idx][i] = fields[key];
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: rows }
  });
}

async function deleteUser(username) {
  const sheets = await getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });
  const [header, ...rows] = resp.data.values || [];
  const idx = rows.findIndex(r => (r[0] || '').toLowerCase() === username.toLowerCase());
  if (idx === -1) throw new Error('Không tìm thấy user');
  // sheetId của "users" thường là 0, nếu không đúng cần lấy động.
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: { sheetId: 0, dimension: "ROWS", startIndex: idx + 1, endIndex: idx + 2 }
        }
      }]
    }
  });
}

// --- API endpoints ---

router.get('/', async (req, res) => {
  try {
    const { username, all } = req.query;
    const users = await getUsers();
    if (all) return res.status(200).json(users);
    if (!username) return res.status(400).json({ error: "Thiếu username." });
    const user = users.find(u => (u.username || '').toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: "Không tìm thấy user." });
    return res.status(200).json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, passwordHash, balance = 0, ip = "", role = "user" } = req.body;
    if (!username || !passwordHash) return res.status(400).json({ error: "Thiếu username hoặc password." });
    const exists = await getUserByUsername(username);
    if (exists) return res.status(400).json({ error: "Username đã tồn tại." });
    await appendUser({ username, passwordHash, balance, ip, role });
    return res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/', async (req, res) => {
  try {
    const { username, ...fields } = req.body;
    if (!username) return res.status(400).json({ error: "Thiếu username." });
    await updateUserFields(username, fields);
    return res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Thiếu username." });
    await deleteUser(username);
    return res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
