const express = require('express');
const router = express.Router();

let txStatus = {
  round: 1,
  timer: 30,
  totalTai: 0,
  totalXiu: 0,
  result: null,
  sum: null,
  dice: [0, 0, 0]
};

let bets = [];
let timerInterval = null;

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

function startRound() {
  if (timerInterval) clearInterval(timerInterval);
  txStatus.timer = 30;
  timerInterval = setInterval(() => {
    txStatus.timer--;
    if (txStatus.timer <= 0) {
      const dice = rollDice();
      const { sum, result } = calcResult(dice);
      txStatus.dice = dice;
      txStatus.sum = sum;
      txStatus.result = result;
      txStatus.totalTai = 0;
      txStatus.totalXiu = 0;
      bets = [];
      txStatus.round++;
      txStatus.timer = 30;
    }
  }, 1000);
}
startRound();

router.get('/', (req, res) => {
  try {
    res.json(txStatus);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

router.post('/bet', (req, res) => {
  try {
    const { username, side, amount } = req.body;
    if (!username || !side || !amount) {
      return res.json({ success: false, error: "Thiếu thông tin" });
    }
    if (txStatus.timer <= 3) return res.json({ success: false, error: "Sắp hết phiên" });
    bets.push({ username, side, amount, time: Date.now(), round: txStatus.round });
    if (side === "tai") txStatus.totalTai += Number(amount);
    if (side === "xiu") txStatus.totalXiu += Number(amount);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || 'Internal server error' });
  }
});

router.post('/update', (req, res) => {
  try {
    const { round, timer, totalTai, totalXiu, result, sum, dice } = req.body;
    if (round !== undefined) txStatus.round = round;
    if (timer !== undefined) txStatus.timer = timer;
    if (totalTai !== undefined) txStatus.totalTai = totalTai;
    if (totalXiu !== undefined) txStatus.totalXiu = totalXiu;
    if (result !== undefined) txStatus.result = result;
    if (sum !== undefined) txStatus.sum = sum;
    if (dice !== undefined) txStatus.dice = dice;
    res.json({ success: true, status: txStatus });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || 'Internal server error' });
  }
});

module.exports = router;
