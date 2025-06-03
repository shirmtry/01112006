const { getSheetsClient, SHEET_ID } = require('./_googleSheet');
const SHEET_NAME = 'requests';

async function getRequests() {
  const sheets = await getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });
  const [header, ...rows] = resp.data.values || [];
  return rows.map(row => {
    const req = {};
    header.forEach((key, i) => req[key] = row[i]);
    return req;
  });
}

async function appendRequest(data) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [data] }
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const requests = await getRequests();
      return res.status(200).json(requests);
    }
    if (req.method === 'POST') {
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
    }
    res.status(405).json({ error: "Phương thức không hỗ trợ." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
