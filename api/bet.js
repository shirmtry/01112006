const { getSheetsClient, SHEET_ID } = require('./_googleSheet');
const SHEET_NAME = 'bets';

async function getBets() {
  const sheets = await getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
  });
  const [header, ...rows] = resp.data.values || [];
  return rows.map(row => {
    const bet = {};
    header.forEach((key, i) => bet[key] = row[i]);
    return bet;
  });
}

async function appendBet(data) {
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
      const bets = await getBets();
      return res.status(200).json(bets);
    }
    if (req.method === 'POST') {
      const { username, side, amount } = req.body;
      if (!username || !side || !amount) return res.status(400).json({ error: "Thiếu thông tin." });
      await appendBet([
        Date.now(),
        username,
        side,
        amount
      ]);
      return res.status(201).json({ success: true });
    }
    res.status(405).json({ error: "Phương thức không hỗ trợ." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
