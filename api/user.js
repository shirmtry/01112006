const { getSheetsClient, SHEET_ID } = require('./_googleSheet');
const SHEET_NAME = 'users';

async function getUsers() {
  const sheets = await getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });
  const [header, ...rows] = resp.data.values || [];
  return rows.map(row => {
    const user = {};
    header.forEach((key, i) => user[key] = row[i]);
    return user;
  });
}

async function appendUser(data) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [data] }
  });
}

async function updateUser(username, fields) {
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
    requestBody: { values: rows }
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
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: 0, dimension: "ROWS", startIndex: idx + 1, endIndex: idx + 2 }
        }
      }]
    }
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { username, all } = req.query;
      const users = await getUsers();
      if (all) return res.status(200).json(users);
      if (!username) return res.status(400).json({ error: "Thiếu username." });
      const user = users.find(u => (u.username || '').toLowerCase() === username.toLowerCase());
      if (!user) return res.status(404).json({ error: "Không tìm thấy user." });
      return res.status(200).json(user);
    }
    if (req.method === 'POST') {
      const { username, passwordHash, balance = 0, ip, role = "user" } = req.body;
      if (!username || !passwordHash) return res.status(400).json({ error: "Thiếu username hoặc password." });
      const users = await getUsers();
      if (users.some(u => (u.username || '').toLowerCase() === username.toLowerCase()))
        return res.status(400).json({ error: "Username đã tồn tại." });
      await appendUser([username, passwordHash, balance, ip, role]);
      return res.status(201).json({ success: true });
    }
    if (req.method === 'PATCH') {
      const { username, ...fields } = req.body;
      if (!username) return res.status(400).json({ error: "Thiếu username." });
      await updateUser(username, fields);
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      const { username } = req.query;
      if (!username) return res.status(400).json({ error: "Thiếu username." });
      await deleteUser(username);
      return res.status(200).json({ success: true });
    }
    res.status(405).json({ error: "Phương thức không hỗ trợ." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
