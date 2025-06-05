const { google } = require("googleapis");
const path = require("path");

// Thay bằng ID Google Sheet thực tế của bạn
const SPREADSHEET_ID = "1_fvM8R8nmyY0WeYdJwBveYRxoFp3P6nIsa862X5GlCQ";

/**
 * Lấy xác thực Google Service Account.
 */
function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "service-account.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/**
 * Đọc toàn bộ dữ liệu của một sheet (bao gồm cả header).
 * @param {string} sheetName - Tên sheet (ví dụ: 'users', 'requests', 'bets')
 * @returns {Promise<Array<Array<string>>>}
 */
async function getSheet(sheetName) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return res.data.values || [];
}

/**
 * Thêm một dòng mới vào sheet.
 * @param {string} sheetName - Tên sheet
 * @param {Array} values - Dữ liệu từng cột dưới dạng mảng
 */
async function appendSheet(sheetName, values) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

/**
 * Cập nhật một dòng cụ thể trong sheet (theo vị trí).
 * @param {string} sheetName - Tên sheet
 * @param {number} rowIndex - Vị trí dòng (bắt đầu từ 1, bao gồm header)
 * @param {Array} values - Dữ liệu update, số lượng phần tử bằng số cột
 */
async function updateRow(sheetName, rowIndex, values) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });
  // Ví dụ: A2:E2 (nếu 5 cột)
  const colEnd = String.fromCharCode(65 + values.length - 1);
  const range = `${sheetName}!A${rowIndex}:${colEnd}${rowIndex}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

/**
 * Xóa một dòng (nâng cao, cần truyền rowIndex bắt đầu từ 1, bao gồm header).
 * @param {string} sheetName
 * @param {number} rowIndex
 */
async function deleteRow(sheetName, rowIndex) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: await getSheetIdByName(sheets, sheetName),
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

/**
 * Lấy sheetId từ sheetName (dùng cho hàm xóa dòng).
 * @private
 */
async function getSheetIdByName(sheets, sheetName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(
    (s) => s.properties.title === sheetName
  );
  if (!sheet) throw new Error("Không tìm thấy sheet name: " + sheetName);
  return sheet.properties.sheetId;
}

module.exports = {
  getSheet,
  appendSheet,
  updateRow,
  deleteRow,
};
