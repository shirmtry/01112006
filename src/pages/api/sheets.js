import { GoogleSpreadsheet } from 'google-spreadsheet';

export default async (req, res) => {
  try {
    // Lấy Service Account Key từ biến môi trường
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    // Khởi tạo Google Spreadsheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key.replace(/\\n/g, '\n'),
    });

    // Đọc dữ liệu
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    res.status(200).json({ data: rows.map(row => row._rawData) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
