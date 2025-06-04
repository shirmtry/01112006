
const express = require('express');
const router = express.Router();
const { appendBet, updateBalance, getUserBalance, setUserBalance } = require('./_googleSheet');

// ========== CONFIG ==========
const BOT_COUNT = 1000;
const BOT_PREFIX = "bot_";
const BOT_BET_AMOUNT = 100000; // mỗi bot cược 100k, bạn có thể tăng/giảm tùy ý

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
    let { username, side, amount, round, result, isBotBatch } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    if (!side) return res.status(400).json({ error: 'side required' });
    if (!amount) amount = BOT_BET_AMOUNT;
    if (!round) round = 1;

    // 1. Ghi lịch sử bet lên sheet cho user/bot
    await appendBet({
      timestamp: new Date().toLocaleString("en-US", { hour12: false }),
      username,
      side,
      amount,
      round,
      result: result || "pending"
    });

    // 2. Nếu là batch của bot, chỉ ghi bet, không xử lý số dư
    if (isBotBatch) return res.json({ ok: true });

    // 3. Nếu là user thật (username không phải bot_), xử lý win/lose và cập nhật balance
    // Quy tắc: khi có user thật cược, user thật luôn thua (bots luôn thắng)
    // Chỉ xử lý update balance khi result là win/lose
    if (!username.startsWith(BOT_PREFIX)) {
      // a. Đầu tiên: khi user cược, tạo bet cho tất cả bot đối ứng (nếu chưa tạo)
      const bots = getBotBetsPerSide();
      for (const bot of bots) {
        await appendBet({
          timestamp: new Date().toLocaleString("en-US", { hour12: false }),
          username: bot.username,
          side: bot.side,
          amount: BOT_BET_AMOUNT,
          round,
          result: bot.side === side ? "lose" : "win" // Bots luôn thắng, user luôn thua
        });
        // Cập nhật balance cho bot
        let botBalance = await getUserBalance(bot.username) || 0;
        botBalance += bot.side === side ? -BOT_BET_AMOUNT : BOT_BET_AMOUNT;
        await setUserBalance(bot.username, botBalance);
      }

      // b. User luôn thua
      let userBalance = await getUserBalance(username) || 0;
      userBalance -= Number(amount);
      await setUserBalance(username, userBalance);

      // Ghi lại kết quả thua vào bet của user (nếu cần)
      await appendBet({
        timestamp: new Date().toLocaleString("en-US", { hour12: false }),
        username,
        side,
        amount,
        round,
        result: "lose"
      });

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
        result: "pending"
      });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

module.exports = router;
