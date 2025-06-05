import { getSheet, appendSheet, updateSheet } from "../../lib/sheets";
import bcrypt from "bcryptjs";

const SHEET = "users";
const HEADER = ["username", "passwordHash", "balance", "ip", "role"];

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Đăng ký: body = { username, password, ip }
    const { username, password, ip } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Thiếu username hoặc password" });
    }
    const rows = await getSheet(SHEET);
    const idx = rows.findIndex(row => row[0] === username);
    if (idx !== -1) return res.status(400).json({ error: "User đã tồn tại" });

    const hash = bcrypt.hashSync(password, 10);
    // Mặc định balance: 1000, role: user
    await appendSheet(SHEET, [
      username,
      hash,
      1000,
      ip || "",
      "user",
    ]);
    return res.json({ success: true });
  }

  if (req.method === "PUT") {
    // Đăng nhập: body = { username, password }
    const { username, password } = req.body;
    const rows = await getSheet(SHEET);
    const idx = rows.findIndex(row => row[0] === username);
    if (idx === -1) return res.status(400).json({ error: "Không tồn tại user" });
    const ok = bcrypt.compareSync(password, rows[idx][1]);
    if (!ok) return res.status(401).json({ error: "Sai mật khẩu" });

    // Trả về đúng các field hiện có
    return res.json({
      username: rows[idx][0],
      balance: rows[idx][2],
      ip: rows[idx][3],
      role: rows[idx][4]
    });
  }

  if (req.method === "GET") {
    // Lấy danh sách users (bỏ header)
    const rows = await getSheet(SHEET);
    const users = rows
      .filter((row, i) => i > 0 && row.length >= 5)
      .map(row => ({
        username: row[0],
        passwordHash: row[1],
        balance: row[2],
        ip: row[3],
        role: row[4]
      }));
    return res.json({ users });
  }

  res.status(405).end();
}
