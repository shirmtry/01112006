const { google } = require('googleapis');

// Đọc biến môi trường, báo lỗi rõ ràng nếu thiếu
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
if (!SHEET_ID) throw new Error('Thiếu biến môi trường GOOGLE_SHEET_ID');

let SERVICE_ACCOUNT;
try {
  SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
} catch (e) {
  throw new Error('Biến GOOGLE_SERVICE_ACCOUNT_KEY không hợp lệ hoặc chưa set.');
}

// Trả về sheets client (với quyền truy cập)
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

module.exports = {
  SHEET_ID,
  getSheetsClient,
};
