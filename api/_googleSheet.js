const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Đổi tên này thành tên file credentials đúng của bạn
const CREDENTIALS_FILENAME = 'service-account.json';

module.exports = async function(req, res) {
  try {
    const credentialsPath = path.join(__dirname, CREDENTIALS_FILENAME);

    // Kiểm tra file credentials có tồn tại
    if (!fs.existsSync(credentialsPath)) {
      return res.status(500).json({
        error: true,
        message: 'Service account credentials file not found. Please add your credentials JSON file to the api/ folder.'
      });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Lấy ID sheet và range từ query hoặc hard-code
    const spreadsheetId = req.query.spreadsheetId || 'YOUR_SPREADSHEET_ID';
    const range = req.query.range || 'Sheet1!A1:D10';

    // Đọc dữ liệu từ Google Sheet
    const result = await sheets.spreadsheets.values.get({ spreadsheetId, range });

    res.json(result.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: true,
      message: err.message || 'Internal server error, please try again later.'
    });
  }
};
