const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

function getSheetsAuth() {
  return new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient() {
  const auth = getSheetsAuth();
  return google.sheets({ version: 'v4', auth });
}

module.exports = {
  SHEET_ID,
  getSheetsAuth,
  getSheetsClient,
};
