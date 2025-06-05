const { google } = require("googleapis");
const path = require("path");

const SPREADSHEET_ID = "1_fvM8R8nmyY0WeYdJwBveYRxoFp3P6nIsa862X5GlCQ"; // Thay bằng ID Google Sheet thật

function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheet(sheetName) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return res.data.values;
}

async function appendSheet(sheetName, values) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

module.exports = { getSheet, appendSheet };
