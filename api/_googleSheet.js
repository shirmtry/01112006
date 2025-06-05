const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
if (!SHEET_ID) throw new Error('Thiếu biến GOOGLE_SHEET_ID');

let SERVICE_ACCOUNT;
try {
  SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
} catch (e) {
  throw new Error('Biến GOOGLE_SERVICE_ACCOUNT_KEY không hợp lệ hoặc chưa set.');
}

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
