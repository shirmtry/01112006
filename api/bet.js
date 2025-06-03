
const SHEETBEST_API = process.env.SHEETBEST_API_BET || process.env.SHEETBEST_API || "https://sheet.best/api/sheets/fd4ba63c-30b3-4a3d-b183-c82fa9f03cbb";
const BET_SHEET = "bets"; // Nếu Google Sheet có nhiều sheet, dùng tên sheet này

// Helper: lấy tất cả cược
async function getAllBets() {
  const url = BET_SHEET
    ? `${SHEETBEST_API}?sheet=${encodeURIComponent(BET_SHEET)}`
    : SHEETBEST_API;
  const headers = process.env.SHEETBEST_KEY
    ? { Authorization: `Bearer ${process.env.SHEETBEST_KEY}` }
    : undefined;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Không kết nối được sheet.best");
  return await res.json();
}

export default async function handler(req, res) {
  const headers = process.env.SHEETBEST_KEY
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SHEETBEST_KEY}` }
    : { 'Content-Type': 'application/json' };

  if (req.method === 'POST') {
    try {
      const { round, username, side, amount, result, sum, time } = req.body;
      if (!username || !side || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const dataToWrite = {
        timestamp: Date.now(),
        username,
        side,
        amount,
      };
      if (round !== undefined) dataToWrite.round = round;
      if (result !== undefined) dataToWrite.result = result;
      if (sum !== undefined) dataToWrite.sum = sum;
      dataToWrite.time = time || new Date().toISOString();

      const url = BET_SHEET
        ? `${SHEETBEST_API}?sheet=${encodeURIComponent(BET_SHEET)}`
        : SHEETBEST_API;

      const createRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(dataToWrite)
      });
      if (!createRes.ok) throw new Error("Không ghi được lên sheet.best");
      const data = await createRes.json();
      return res.status(201).json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const bets = await getAllBets();
      return res.json({ bets: bets || [] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    // SheetBest không hỗ trợ xóa hàng loạt
    return res.status(200).json({ success: true, note: "sheet.best không hỗ trợ xoá hàng loạt, hãy xóa thủ công trên Google Sheet hoặc ghi đè bằng tay." });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
