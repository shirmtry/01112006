const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// ========== BET SHEET ==========
// Cột: timestamp | username | side | amount | round | result | sum | dice1 | dice2 | dice3

async function appendBet({ timestamp, username, side, amount, round, result, sum, dice1, dice2, dice3 }) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'bets!A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[
        timestamp || new Date().toLocaleString("en-US", { hour12: false }),
        username,
        side,
        amount,
        round,
        result,
        sum,
        dice1,
        dice2,
        dice3
      ]]
    }
  });
}

// ========== USER SHEET ==========
// Cột: username | passwordHash | balance | ip | role

async function getUserBalance(username) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'users!A2:E',
  });
  const users = res.data.values || [];
  for (let i = 0; i < users.length; i++) {
    if (users[i][0] === username) {
      return Number(users[i][2]) || 0;
    }
  }
  return null;
}

async function setUserBalance(username, newBalance) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'users!A2:E',
  });
  const users = res.data.values || [];
  let rowIdx = -1;
  for (let i = 0; i < users.length; i++) {
    if (users[i][0] === username) {
      rowIdx = i + 2; // +2 vì header là dòng 1
      break;
    }
  }
  if (rowIdx > 1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `users!C${rowIdx}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[newBalance]] }
    });
  } else {
    throw new Error('User not found');
  }
}

// ========== Lấy lịch sử cược của user ==========
async function getUserBets(username) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'bets!A2:J',
  });
  const bets = res.data.values || [];
  return bets
    .filter(row => row[1] === username)
    .map(row => ({
      timestamp: row[0],
      username: row[1],
      side: row[2],
      amount: row[3],
      round: row[4],
      result: row[5],
      sum: row[6],
      dice1: row[7],
      dice2: row[8],
      dice3: row[9]
    }));
}

module.exports = {
  getSheetsClient,
  SHEET_ID,
  appendBet,
  getUserBalance,
  setUserBalance,
  getUserBets,
};
