// --- Cấu hình ---
const SHEET_BEST_URL = process.env.SHEETBEST_API_REQUEST || "https://sheet.best/api/sheets/1_fvM8R8nmyY0WeYdJwBveYRxoFp3P6nIsa862X5GlCQ/tabs/requests";

// Tạo request nạp/rút hoặc lấy danh sách request
export default async function handler(req, res) {
  // Nạp/rút (tạo request mới)
  if (req.method === 'POST') {
    try {
      const { username, type, amount, bank_code, note } = req.body;
      if (!username || !type || !amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Thiếu thông tin hoặc số tiền không hợp lệ.' });
      }
      // Tạo request, mặc định status là "pending"
      const response = await fetch(SHEET_BEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          username,
          type,
          amount,
          status: 'pending',
          bank_code: bank_code || "",
          note: note || ""
        })
      });
      if (!response.ok) throw new Error("Không ghi được lên sheet.best");
      return res.status(201).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Lấy danh sách request (cho admin)
  if (req.method === 'GET') {
    try {
      const response = await fetch(SHEET_BEST_URL);
      if (!response.ok) throw new Error("Không lấy được danh sách requests");
      const data = await response.json();
      return res.status(200).json({ data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Xóa request (nếu cần)
  if (req.method === 'DELETE') {
    // Sheet.best không hỗ trợ xóa hàng loạt, chỉ trả về thông báo
    return res.status(200).json({ success: true, note: "sheet.best không hỗ trợ xoá hàng loạt. Hãy xóa thủ công trên Google Sheet nếu cần." });
  }

  res.status(405).json({ error: "Phương thức không hỗ trợ." });
}
