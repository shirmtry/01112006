const { getSheet, appendSheet } = require("../src/api/sheets");

const SHEET = "bets";

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
    const {
      username, side, amount, round, result, sum, dice1, dice2, dice3
    } = body;
    const timestamp = Date.now();
    await appendSheet(SHEET, [
      timestamp, username, side, amount, round, result, sum, dice1, dice2, dice3
    ]);
    return res.json({ success: true });
  }
  if (req.method === "GET") {
    const rows = await getSheet(SHEET);
    return res.json({ bets: rows.slice(1) });
  }
  res.status(405).end();
};
