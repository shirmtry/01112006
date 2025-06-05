const express = require('express');
const router = express.Router();
const { getSheetsClient, SHEET_ID } = require('./_googleSheet');

const SHEET_NAME = 'users';

// Helper: Lấy toàn bộ user
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

// GET /api/user?username=...
router.get('/', async (req, res) => {
  try {
    const { username, all } = req.query;
    const users = await getUsers();
    if (all) return res.status(200).json(users);
    if (!username) return res.status(400).json({ error: "Thiếu username." });
    const user = users.find(u => (u.username || '').toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: "Không tìm thấy user" });
    return res.status(200).json(user);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Lỗi máy chủ" });
  }
});
module.exports = router;
