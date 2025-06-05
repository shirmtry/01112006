import { google } from "googleapis";
import path from "path";

const SPREADSHEET_ID = "1_fvM8R8nmyY0WeYdJwBveYRxoFp3P6nIsa862X5GlCQ"; // Thay bằng ID thật

function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function getSheet(sheetName) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return res.data.values;
}

export async function appendSheet(sheetName, values) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

export async function updateSheet(sheetName, range, values) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}
