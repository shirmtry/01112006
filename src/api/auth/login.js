import { getSheetData } from '@/utils/googleSheetsClient';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and Password cannot be empty' });
    }

    try {
      const users = await getSheetData('Users');
      const userRow = users.slice(1).find(row => row[1] === username);

      if (!userRow) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      const hashedPassword = userRow[2];
      const isPasswordValid = await bcrypt.compare(password, hashedPassword);

      if (isPasswordValid) {
        return res.status(200).json({
          message: 'Login successful',
          user: {
            userId: userRow[0],
            username: userRow[1],
            balance: parseFloat(userRow[3])
          }
        });
      } else {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
