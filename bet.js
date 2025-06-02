const SHEET_BEST_URL = "https://sheet.best/api/sheets/fd4ba63c-30b3-4a3d-b183-c82fa9f03cbb"; // sheet.best URL của bạn
const BET_SHEET = "bets"; // (sheet.best sẽ map sheetname nếu bạn dùng nhiều sheet, nếu chỉ 1 sheet thì bỏ qua)

// Helper: lấy tất cả cược
async function getAllBets() {
  // Nếu dùng nhiều sheet, thêm &sheet=BET_SHEET vào URL
  const res = await fetch(`${SHEET_BEST_URL}?sheet=${BET_SHEET}`);

  if (!res.ok) throw new Error("Không kết nối được sheet.best");
  return await res.json();
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { username, side, amount } = req.body;
      if (!username || !side || !amount) {

        return res.status(400).json({ error: 'Missing required fields' });
      }
      const createRes = await fetch(`${SHEET_BEST_URL}?sheet=${BET_SHEET}`, {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: Date.now(),
          username,
          side,
          amount

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
      const bets = await getAllBets();
      // bets là mảng object {timestamp, username, side, amount}
      return res.json({ bets: bets || [] });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  if (req.method === 'DELETE') {
    try {
      // Xóa tất cả cược: sheet.best không hỗ trợ xóa hết, sẽ PATCH hết amount=0 hoặc xóa từng dòng
      // Ở đây sẽ PATCH tất cả cược về amount=0 như một cách "reset"
      // Nếu bạn muốn reset thật thì nên tạo sheet mới hoặc ghi đè header
      // (Hoặc xóa hết từng dòng bằng DELETE từng username, nhưng không tối ưu)
      return res.status(200).json({ success: true, note: "sheet.best không hỗ trợ xoá hàng loạt, hãy xóa thủ công trên Google Sheet hoặc ghi đè bằng tay." });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.status(405).end();
}