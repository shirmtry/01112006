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
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to append data to Google Sheet: ${error.message}`);
  }
}

export async function getSheetData(sheetName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
    return response.data.values || [];
  } catch (error) {
    throw new Error(`Failed to get data from Google Sheet: ${error.message}`);
  }
}

export async function updateSheet(sheetName, range, values) {
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update Google Sheet: ${error.message}`);
  }
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
