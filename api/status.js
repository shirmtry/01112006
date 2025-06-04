import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    // Chuẩn bị Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Lấy dữ liệu bets
    const betsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'bets',
    });
    const data = betsRes.data.values || [];
    // Header columns: timestamp | username | side | amount | round | result | sum | dice1 | dice2 | dice3

    // Xác định round hiện tại (round lớn nhất hoặc round chưa có kết quả)
    let round = 1;
    let maxRound = 1;
    let openRounds = [];
    for (let i = 1; i < data.length; i++) {
      const rowRound = Number(data[i][4]);
      if (!isNaN(rowRound)) {
        maxRound = Math.max(maxRound, rowRound);
        // Nếu chưa có kết quả (sum chưa có), coi là round hiện tại
        if (!data[i][6]) openRounds.push(rowRound);
      }
    }
    round = openRounds.length ? Math.min(...openRounds) : (maxRound + 1);

    // Tổng hợp tổng cược tài/xỉu của round hiện tại
    let totalTai = 0, totalXiu = 0;
    let dice = null, sum = null, result = null;
    for (let i = 1; i < data.length; i++) {
      if (Number(data[i][4]) === round) {
        if (data[i][2] === "tai") totalTai += Number(data[i][3]);
        if (data[i][2] === "xiu") totalXiu += Number(data[i][3]);
        if (data[i][6]) { // sum đã có, round này đã roll
          sum = Number(data[i][6]);
          dice = [Number(data[i][7]), Number(data[i][8]), Number(data[i][9])];
          result = data[i][5];
        }
      }
    }

    // Timer: (tùy bạn, nếu có sheet "state", hãy lấy timer tại đây; nếu không, trả về ước lượng hoặc hardcode)
    // Đề xuất: Có sheet "state" với cột currentRound, roundStartTime, roundEndTime, timer
    let timer = 30;
    try {
      const stateRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'state!A1:D2'
      });
      const state = stateRes.data.values;
      if (state && state.length > 1 && Number(state[1][0]) === round) {
        const endTime = new Date(state[1][2]).getTime();
        const now = Date.now();
        timer = Math.max(0, Math.floor((endTime - now) / 1000));
      }
    } catch (e) {} // Nếu không có sheet state thì cứ hardcode timer là 30

    // Trả về kết quả realtime cho frontend
    res.status(200).json({
      round,
      totalTai,
      totalXiu,
      timer,
      sum,
      dice,
      result,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
