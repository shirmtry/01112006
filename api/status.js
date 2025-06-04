const express = require('express');
const router = express.Router();

// Trạng thái toàn bộ phiên game (chung cho mọi user)
let txStatus = {
  round: 1,
  timer: 30,
  totalTai: 0,
  totalXiu: 0,
  result: null, // "tai" | "xiu"
  sum: null,
  dice: [0, 0, 0]
};

// Lưu cược tạm thời cho phiên hiện tại
let bets = []; // {username, side, amount, time, round}

let timerInterval = null;

// Hàm random xúc xắc
function rollDice() {
  return [
    1 + Math.floor(Math.random() * 6),
    1 + Math.floor(Math.random() * 6),
    1 + Math.floor(Math.random() * 6)
  ];
}
function calcResult(dice) {
  const sum = dice[0] + dice[1] + dice[2];
  return {
    sum,
    result: (sum >= 11 && sum <= 17) ? 'tai' : 'xiu'
  };
}

// Khởi động timer tự động đổi phiên
function startRound() {
  if (timerInterval) clearInterval(timerInterval);
  txStatus.timer = 30;
  timerInterval = setInterval(() => {
    txStatus.timer--;
    if (txStatus.timer <= 0) {
      // Kết thúc phiên, tính kết quả
      const dice = rollDice();
      const { sum, result } = calcResult(dice);
      txStatus.dice = dice;
      txStatus.sum = sum;
      txStatus.result = result;

      // Reset tổng cược tài/xỉu
      txStatus.totalTai = 0;
      txStatus.totalXiu = 0;

      // Reset cược tạm thời
      bets = [];

      // Sang phiên mới
      txStatus.round++;
      txStatus.timer = 30;
    }
  }, 1000);
}
startRound();

// Lấy trạng thái phiên hiện tại
router.get('/', (req, res) => {
  res.json(txStatus);
});

// API đặt cược (client gọi)
router.post('/bet', (req, res) => {
  const { username, side, amount } = req.body;
  if (!username || !side || !amount) {
    return res.json({ success: false, error: "Thiếu thông tin" });
  }
  if (txStatus.timer <= 3) return res.json({ success: false, error: "Sắp hết phiên" });
  bets.push({ username, side, amount, time: Date.now(), round: txStatus.round });
  if (side === "tai") txStatus.totalTai += Number(amount);
  if (side === "xiu") txStatus.totalXiu += Number(amount);
  res.json({ success: true });
});

// Cho admin hoặc backend update kết quả thủ công (nếu cần)
router.post('/update', (req, res) => {
  const { round, timer, totalTai, totalXiu, result, sum, dice } = req.body;
  if (round !== undefined) txStatus.round = round;
  if (timer !== undefined) txStatus.timer = timer;
  if (totalTai !== undefined) txStatus.totalTai = totalTai;
  if (totalXiu !== undefined) txStatus.totalXiu = totalXiu;
  if (result !== undefined) txStatus.result = result;
  if (sum !== undefined) txStatus.sum = sum;
  if (dice !== undefined) txStatus.dice = dice;
  res.json({ success: true, status: txStatus });
});

module.exports = router;
