import { appendToSheet, getSheetData } from '@/utils/googleSheetsClient';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { sheetName, data } = req.body;
      if (!sheetName || !data || !Array.isArray(data)) {
        return res.status(400).json({ message: 'Missing sheetName or data' });
      }
      await appendToSheet(sheetName, data);
      return res.status(200).json({ message: 'Data appended successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const { sheetName } = req.query;
      if (!sheetName) {
        return res.status(400).json({ message: 'Missing sheetName query parameter' });
      }
      const data = await getSheetData(sheetName);
      return res.status(200).json({ data });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
