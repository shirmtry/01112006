const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getSheetsClient, SHEET_ID } = require('./_googleSheet');

const SHEET_NAME = 'users';

// --- Helper functions ---
async function getUsers() {
  try {
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
  } catch (err) {
    console.error('[getUsers] Google Sheets error:', err.message);
    throw new Error('Không thể lấy danh sách user.');
  }
}

async function getUserByUsername(username) {
  const users = await getUsers();
  return users.find(u => (u.username || '').toLowerCase() === (username || '').toLowerCase());
}

async function appendUser({ username, passwordHash, balance = 0, ip = "", role = "user" }) {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [[username, passwordHash, balance, ip, role]] }
    });
  } catch (err) {
    console.error('[appendUser] Google Sheets error:', err.message);
    throw new Error('Không thể thêm user mới.');
  }
}

async function updateUserFields(username, fields) {
  try {
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
  } catch (err) {
    console.error('[updateUserFields] Google Sheets error:', err.message);
    throw new Error('Không thể cập nhật user.');
  }
}

async function deleteUser(username) {
  try {
    const sheets = await getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
    });
    const [header, ...rows] = resp.data.values || [];
    const idx = rows.findIndex(r => (r[0] || '').toLowerCase() === username.toLowerCase());
    if (idx === -1) throw new Error('Không tìm thấy user');
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
  } catch (err) {
    console.error('[deleteUser] Google Sheets error:', err.message);
    throw new Error('Không thể xóa user.');
  }
}

// --- API endpoints ---

// Đăng ký
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Thiếu username hoặc password" });

    // Chặn ký tự đặc biệt hoặc xuống dòng gây lỗi sheet
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
      return res.status(400).json({ error: "Username chỉ được chứa chữ, số, gạch dưới (3-30 ký tự)" });

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
    return res.status(500).json({ error: e.message || "Lỗi máy chủ, thử lại sau" });
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

    return res.status(200).json({
      message: "Đăng nhập thành công!",
      username: user.username,
      role: user.role
    });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: e.message || "Lỗi máy chủ, thử lại sau" });
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
    return res.status(500).json({ error: e.message || "Lỗi máy chủ" });
  }
});

// Cập nhật user
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
