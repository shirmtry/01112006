const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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

// Đăng ký
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Thiếu username hoặc password" });

    const existing = await getUserByUsername(username);
    if (existing)
      return res.status(409).json({ error: "Tài khoản đã tồn tại" });

    const hash = await bcrypt.hash(password, 10);
    await appendUser({
      username: username.trim(),
      passwordHash: hash,
      balance: 0,
      ip: req.ip,
      role: "user"
    });
    return res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({ error: "Lỗi máy chủ, thử lại sau" });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Thiếu username hoặc password" });

    const user = await getUserByUsername(username);
    if (!user)
      return res.status(404).json({ error: "Tài khoản không tồn tại" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ error: "Mật khẩu sai" });

    // Nếu muốn trả về token JWT thì bổ sung ở đây
    return res.status(200).json({
      message: "Đăng nhập thành công!",
      username: user.username,
      role: user.role
    });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: "Lỗi máy chủ, thử lại sau" });
  }
});

// Lấy thông tin user (GET /api/user?username=...)
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
    console.error('Get user error:', e);
    return res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

// Cập nhật user (ví dụ đổi mật khẩu, số dư, role, ... - cần bảo vệ route này!)
router.post('/update', async (req, res) => {
  try {
    const { username, ...fields } = req.body;
    if (!username) return res.status(400).json({ error: "Thiếu username" });
    await updateUserFields(username, fields);
    return res.status(200).json({ message: "Cập nhật thành công" });
  } catch (e) {
    console.error('Update user error:', e);
    return res.status(500).json({ error: e.message || "Lỗi máy chủ" });
  }
});

// Xóa user
router.post('/delete', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Thiếu username" });
    await deleteUser(username);
    return res.status(200).json({ message: "Xóa user thành công" });
  } catch (e) {
    console.error('Delete user error:', e);
    return res.status(500).json({ error: e.message || "Lỗi máy chủ" });
  }
});

module.exports = router;
