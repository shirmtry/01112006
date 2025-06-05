const { getSheet, appendSheet } = require("../src/lib/sheets");
const bcrypt = require("bcryptjs");

const SHEET = "users";

module.exports = async function (req, res) {
  if (req.method === "PUT") {
    // Đăng nhập
    let body = req.body;
    if (!body) {
      let data = "";
      await new Promise((resolve) => {
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
          body = JSON.parse(data);
          resolve();
        });
      });
    }
    const { username, password } = body;
    const rows = await getSheet(SHEET);
    const idx = rows.findIndex(row => row[0] === username);
    if (idx === -1) return res.status(400).json({ error: "Không tồn tại user" });
    const ok = bcrypt.compareSync(password, rows[idx][1]);
    if (!ok) return res.status(401).json({ error: "Sai mật khẩu" });
    return res.json({
      username: rows[idx][0],
      balance: rows[idx][2],
      ip: rows[idx][3],
      role: rows[idx][4]
    });
  }
  if (req.method === "POST") {
    // Đăng ký
    let body = req.body;
    if (!body) {
      let data = "";
      await new Promise((resolve) => {
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
          body = JSON.parse(data);
          resolve();
        });
      });
    }
    const { username, password, ip } = body;
    const rows = await getSheet(SHEET);
    if (rows.find(row => row[0] === username))
      return res.status(400).json({ error: "User đã tồn tại" });
    const hash = bcrypt.hashSync(password, 10);
    await appendSheet(SHEET, [
      username,
      hash,
      1000,
      ip || "",
      "user"
    ]);
    return res.json({ success: true });
  }
  res.status(405).end();
};
