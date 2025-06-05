const { getSheet, appendSheet } = require("../src/api/sheets");

const SHEET = "requests";

module.exports = async function (req, res) {
  if (req.method === "POST") {
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
    const { username, type, amount, bank_code, note } = body;
    const timestamp = Date.now();
    await appendSheet(SHEET, [
      timestamp, username, type, amount, "pending", bank_code || "", note || ""
    ]);
    return res.json({ success: true });
  }
  if (req.method === "GET") {
    const rows = await getSheet(SHEET);
    return res.json({ requests: rows.slice(1) });
  }
  res.status(405).end();
};
