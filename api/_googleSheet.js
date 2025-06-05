const { google } = require('googleapis');

module.exports = async function(req, res) {
  try {
    // Ví dụ: lấy dữ liệu từ Google Sheet
    const auth = new google.auth.GoogleAuth({
      credentials: {/* ...thông tin xác thực... */},
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = 'YOUR_SPREADSHEET_ID';
    const range = 'Sheet1!A1:D10';
    const result = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    res.json(result.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: err.message || 'Internal server error, please try again later.' });
  }
};
