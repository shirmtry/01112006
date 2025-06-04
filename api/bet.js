
const express = require('express');
const router = express.Router();
const {
  appendBet,
  getUserBalance,
  setUserBalance,
  getUserBets,
} = require('./_googleSheet');

// ========== CONFIG ==========
const BOT_COUNT = 1000;
const BOT_PREFIX = "bot_";
const BOT_BET_AMOUNT = 100000;

// ========== HELPERS ==========
function getBotBetsPerSide() {
  // 500 bot tài, 500 bot xỉu
  const bots = [];
  for (let i = 1; i <= BOT_COUNT; i++) {
    const botUser = BOT_PREFIX + i;
    const side = i <= BOT_COUNT / 2 ? "xiu" : "tai";
    bots.push({ username: botUser, side });
  }
  return bots;
}

// ========== MAIN ROUTES ==========

// [POST] /api/bet
router.post('/', async (req, res) => {
  try {
    let { username, side, amount, round, result, sum, isBotBatch } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    if (!side) return res.status(400).json({ error: 'side required' });
    if (!amount) amount = BOT_BET_AMOUNT;
    if (!round) round = 1;

    // Luôn ghi lịch sử bet lên sheet cho user/bot (THÊM CỘT sum)
    await appendBet({
      timestamp: new Date().toLocaleString("en-US", { hour12: false }),
      username,
      side,
      amount,
      round,
      result: result || "pending",
      sum: sum ?? ""
    });

    // Nếu là batch của bot, chỉ ghi bet, không xử lý số dư
    if (isBotBatch) return res.json({ ok: true });

    // Nếu là user thật (username không phải bot_), xử lý win/lose và cập nhật balance
    // Khi có user thật cược, user thật luôn thua (bots luôn thắng)
    if (!username.startsWith(BOT_PREFIX)) {
      // Khi user cược, tạo bet cho tất cả bot đối ứng (nếu chưa tạo)
      const bots = getBotBetsPerSide();
      for (const bot of bots) {
        await appendBet({
          timestamp: new Date().toLocaleString("en-US", { hour12: false }),
          username: bot.username,
          side: bot.side,
          amount: BOT_BET_AMOUNT,
          round,
          result: bot.side === side ? "lose" : "win",
          sum: sum ?? ""
        });
        // Cập nhật balance cho bot
        let botBalance = await getUserBalance(bot.username) || 0;
        botBalance += bot.side === side ? -BOT_BET_AMOUNT : BOT_BET_AMOUNT;
        await setUserBalance(bot.username, botBalance);
      }

      // User luôn thua
      let userBalance = await getUserBalance(username) || 0;
      userBalance -= Number(amount);
      await setUserBalance(username, userBalance);

      // KHÔNG ghi thêm dòng lose lặp lại cho user nữa!

      return res.json({ ok: true, userBalance });
    }

    // Nếu là bot: update balance cho bot (win/lose)
    if (username.startsWith(BOT_PREFIX) && result) {
      let botBalance = await getUserBalance(username) || 0;
      botBalance += result === "win" ? Number(amount) : -Number(amount);
      await setUserBalance(username, botBalance);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
});

// ========== AUTO BOT BET ==========
// Gọi endpoint này để cho 1000 bot cược tự động mỗi round (nên gọi từ server hoặc cron job)
router.post('/auto-bot', async (req, res) => {
  try {
    const { round } = req.body;
    const bots = getBotBetsPerSide();
    for (const bot of bots) {
      await appendBet({
        timestamp: new Date().toLocaleString("en-US", { hour12: false }),
        username: bot.username,
        side: bot.side,
        amount: BOT_BET_AMOUNT,
        round,
        result: "pending",
        sum: ""
      });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// ========== USER BET HISTORY ==========
// [GET] /api/bet/history?username=...
router.get('/history', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });
    const bets = await getUserBets(username);
    // Đảm bảo trả về đúng trường, đúng thứ tự cho frontend hiển thị
    const formatted = bets.map(bet => ({
      time: bet.time || bet.timestamp || "",
      bet_side: bet.bet_side || bet.side || "",
      amount: bet.amount || "",
      result: bet.result || "",
      sum: bet.sum || "",
      round: bet.round || ""
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

module.exports = router;
