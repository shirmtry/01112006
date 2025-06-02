const SHEET_BEST_URL = "https://sheet.best/api/sheets/fd4ba63c-30b3-4a3d-b183-c82fa9f03cbb";
const REQUEST_SHEET = "requests";

async function getAllRequests() {
  const res = await fetch(`${SHEET_BEST_URL}?sheet=${REQUEST_SHEET}`);
  if (!res.ok) throw new Error("Không kết nối được sheet.best");
  return await res.json();
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { username, type, amount, status, bank_code } = req.body;
      if (!username || !type || !amount || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const createRes = await fetch(`${SHEET_BEST_URL}?sheet=${REQUEST_SHEET}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: Date.now(),
          username,
          type,
          amount,
          status,
          bank_code: bank_code || ""
        })
      });
      if (!createRes.ok) throw new Error("Không ghi được lên sheet.best");
      return res.status(201).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  if (req.method === 'GET') {
    try {
      const requests = await getAllRequests();
      return res.json({ requests: requests || [] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.status(405).end();
}
