const SHEET_BEST_URL = "https://sheet.best/api/sheets/fd4ba63c-30b3-4a3d-b183-c82fa9f03cbb"; // sheet.best URL của bạn

// Helper: Lấy toàn bộ user
async function getAllUsers() {
  const res = await fetch(SHEET_BEST_URL);
  if (!res.ok) throw new Error("Không kết nối được sheet.best");
  return await res.json();
}

// Helper: Lấy user theo username (so sánh chính xác, không bị lỗi dòng rỗng)
async function getUser(username) {
  const res = await fetch(`${SHEET_BEST_URL}?username=${encodeURIComponent(username)}&t=${Date.now()}`);
  if (!res.ok) return null;
  const users = await res.json();
  // Trả về đúng user có username trùng (không bị dòng rỗng/hỏng, không phân biệt hoa thường)
  return (Array.isArray(users) && users.length > 0)
    ? users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase()) || null
    : null;
}

export default async function handler(req, res) {
  // Đăng ký user
  if (req.method === "POST") {
    try {
      const { username, passwordHash, ip } = req.body;
      if (!username || !passwordHash) {
        return res.status(400).json({ error: "Thiếu username hoặc password." });
      }
      const exists = await getUser(username);
      if (exists && exists.username && exists.username.toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({ error: "Username đã tồn tại." });
      }
      // Tạo user mới với balance mặc định là 10000
      const createRes = await fetch(SHEET_BEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          passwordHash,
          balance: 10000,
          ip,
          role: "user"
        })
      });
      if (!createRes.ok) throw new Error("Không ghi được lên sheet.best");
      return res.status(201).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Lấy thông tin user hoặc toàn bộ user
  if (req.method === "GET") {
    try {
      const { username, all } = req.query;
      if (all) {
        const users = await getAllUsers();
        // KHÔNG trả về passwordHash khi trả về danh sách
        return res.status(200).json(users.map(u => ({
          username: u.username,
          balance: u.balance,
          ip: u.ip,
          role: u.role || "user"
        })));
      }
      if (!username) {
        return res.status(400).json({ error: "Thiếu username." });
      }
      const user = await getUser(username);
      if (!user) {
        return res.status(404).json({ error: "Không tìm thấy user." });
      }
      return res.status(200).json({
        username: user.username,
        passwordHash: user.passwordHash, // Để FE kiểm tra password khi login
        balance: user.balance,
        ip: user.ip,
        role: user.role || "user"
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Cập nhật số dư user (và IP nếu có)
  if (req.method === "PATCH") {
    try {
      const { username, balance, ip } = req.body;
      if (!username || typeof balance === "undefined") {
        return res.status(400).json({ error: "Thiếu username hoặc balance." });
      }
      // sheet.best update bằng PATCH với filter username
      const updateRes = await fetch(`${SHEET_BEST_URL}?username=${encodeURIComponent(username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ip ? { balance, ip } : { balance })
      });
      if (!updateRes.ok) throw new Error("Không update được user");
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Xóa user
  if (req.method === "DELETE") {
    try {
      const { username } = req.query;
      if (!username) {
        return res.status(400).json({ error: "Thiếu username." });
      }
      const delRes = await fetch(`${SHEET_BEST_URL}?username=${encodeURIComponent(username)}`, {
        method: 'DELETE'
      });
      if (!delRes.ok) throw new Error("Không xóa được user");
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: "Phương thức không hỗ trợ." });
}
