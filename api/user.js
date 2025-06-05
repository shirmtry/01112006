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

// Helper: Lấy user theo username
async function getUserByUsername(username) {
  const users = await getUsers();
  return users.find(u => (u.username || '').toLowerCase() === (username || '').toLowerCase());
}

// Helper: Thêm user mới
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

// Helper: Cập nhật user (update balance)
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

// ============== API ==============

// Đăng ký
router.post('/', async (req, res) => {
  try {
    const { username, passwordHash, balance, role } = req.body;
    if (!username || !passwordHash)
      return res.status(400).json({ error: "Thiếu username hoặc password" });

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
      return res.status(400).json({ error: "Tên đăng nhập chỉ gồm chữ, số, gạch dưới (3-30 ký tự)" });

    const existing = await getUserByUsername(username);
    if (existing)
      return res.status(409).json({ error: "Tài khoản đã tồn tại" });

    await appendUser({
      username: username.trim(),
      passwordHash: passwordHash,
      balance: balance ? Number(balance) : 0,
      ip: req.ip,
      role: role || "user"
    });
    return res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Lỗi máy chủ, thử lại sau" });
  }
});

// Đăng nhập (GET /api/user?username=...)
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

// Cập nhật user (PATCH /api/user)
router.patch('/', async (req, res) => {
  try {
    const { username, ...fields } = req.body;
    if (!username) return res.status(400).json({ error: "Thiếu username" });
    await updateUserFields(username, fields);
    return res.status(200).json({ message: "Cập nhật thành công" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Lỗi máy chủ" });
  }
});

module.exports = router;
