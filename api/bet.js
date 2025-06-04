const express = require('express');
const router = express.Router();
const {google} = require('googleapis');
const dayjs = require('dayjs');

// Helper functions to interact with Google Sheets
const SHEET_ID = 'YOUR_SHEET_ID';
const USERS_SHEET = 'users';
const BETS_SHEET = 'bets';

async function getSheet(auth, sheetName) {
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  return res.data.values;
}

async function appendSheet(auth, sheetName, row) {
  const sheets = google.sheets({version: 'v4', auth});
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {values: [row]}
  });
}

async function updateUserBalance(auth, username, delta) {
  const data = await getSheet(auth, USERS_SHEET);
  const header = data[0];
  const idx = data.findIndex(row => row[0] === username);
  if(idx < 0) throw new Error('User not found');
  let balanceIdx = header.indexOf('balance');
  let balance = parseInt(data[idx][balanceIdx] || 0);
  balance += delta;
  data[idx][balanceIdx] = balance;
  const sheets = google.sheets({version: 'v4', auth});
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: USERS_SHEET + '!' + `A${idx+1}:E${idx+1}`,
    valueInputOption: 'USER_ENTERED',
    resource: {values: [data[idx]]}
  });
  return balance;
}

// Đặt cược (trừ tiền ngay)
router.post('/', async (req, res) => {
  const {username, side, amount, round} = req.body;
  const auth = req.auth;
  // Trừ tiền trước
  try {
    const balance = await updateUserBalance(auth, username, -amount);
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await appendSheet(auth, BETS_SHEET, [
      now, username, side, amount, round, 'pending', '', '', '', ''
    ]);
    res.json({ok:true, balance});
  } catch (e) {
    res.status(400).json({error: e.message});
  }
});

// Settle round (admin hoặc backend call, ví dụ khi hết phiên)
router.post('/settle', async (req, res) => {
  const {round, sum, dice1, dice2, dice3} = req.body;
  const auth = req.auth;
  const data = await getSheet(auth, BETS_SHEET);
  const header = data[0];
  let changed = [];
  for(let i=1;i<data.length;i++) {
    let row = data[i];
    if(row[4]==round && row[5]=='pending') {
      let side = row[2];
      let amount = parseInt(row[3]);
      let username = row[1];
      let isTai = (sum>=11 && sum<=17);
      let result = ((side==='tai' && isTai) || (side==='xiu' && !isTai)) ? 'win' : 'lose';
      // Cộng lại tiền nếu thắng
      if(result==='win') await updateUserBalance(auth, username, amount*2);
      // Update dòng này
      row[5] = result;
      row[6] = sum;
      row[7] = dice1;
      row[8] = dice2;
      row[9] = dice3;
      changed.push({rowIdx:i, row});
    }
  }
  // Ghi lại các dòng bet đã update
  const sheets = google.sheets({version: 'v4', auth});
  for(const c of changed) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: BETS_SHEET + '!' + `A${c.rowIdx+1}:J${c.rowIdx+1}`,
      valueInputOption: 'USER_ENTERED',
      resource: {values: [c.row]}
    });
  }
  res.json({ok:true, changed: changed.length});
});

// Lấy lịch sử cược của user
router.get('/history', async (req, res) => {
  const username = req.query.username;
  const auth = req.auth;
  const data = await getSheet(auth, BETS_SHEET);
  const header = data[0];
  const result = [];
  for(let i=1;i<data.length;i++) {
    let row = data[i];
    if(row[1]===username) {
      result.push({
        timestamp: row[0], username: row[1], side: row[2], amount: row[3],
        round: row[4], result: row[5], sum: row[6], dice1: row[7], dice2: row[8], dice3: row[9]
      });
    }
  }
  res.json(result);
});

// Lịch sử kết quả toàn hệ thống
router.get('/all', async (req, res) => {
  const auth = req.auth;
  const data = await getSheet(auth, BETS_SHEET);
  const header = data[0];
  const result = [];
  for(let i=1;i<data.length;i++) {
    let row = data[i];
    if(row[5]!=='pending') {
      result.push({
        timestamp: row[0], username: row[1], side: row[2], amount: row[3],
        round: row[4], result: row[5], sum: row[6], dice1: row[7], dice2: row[8], dice3: row[9]
      });
    }
  }
  // Lấy mỗi round 1 kết quả (của user đầu tiên đặt), hoặc group by round nếu muốn
  let byRound = {};
  for(const r of result) {
    if(!byRound[r.round]) byRound[r.round] = r;
  }
  res.json(Object.values(byRound).sort((a,b)=>Number(a.round)-Number(b.round)));
});

module.exports = router;
