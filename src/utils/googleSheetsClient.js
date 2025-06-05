import { google } from 'googleapis';

const serviceAccountEmail = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY
  ? process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccountEmail,
    private_key: privateKey,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function appendToSheet(sheetName, values) {
  const resource = { values: [values] };
  const request = {
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    resource,
  };
  const response = await sheets.spreadsheets.values.append(request);
  return response.data;
}

export async function getSheetData(sheetName) {
  const request = {
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  };
  const response = await sheets.spreadsheets.values.get(request);
  return response.data.values || [];
}

export async function updateSheet(sheetName, range, values) {
  const resource = { values: values };
  const request = {
    spreadsheetId,
    range: `${sheetName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    resource,
  };
  const response = await sheets.spreadsheets.values.update(request);
  return response.data;
}

export async function getRowById(sheetName, idColumnIndex, idValue) {
  const data = await getSheetData(sheetName);
  if (!data || data.length < 2) return null;
  const rows = data.slice(1);

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][idColumnIndex] === idValue) {
      return {
        data: rows[i],
        rowIndex: i + 2
      };
    }
  }
  return null;
}

export async function updateRow(sheetName, rowIndex, values) {
  const range = `A${rowIndex}:Z${rowIndex}`;
  return await updateSheet(sheetName, range, [values]);
}
