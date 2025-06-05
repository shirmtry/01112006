import { appendToSheet, getSheetData } from '@/utils/googleSheetsClient';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and Password cannot be empty' });
    }

    try {
      const existingUsers = await getSheetData('Users');
      if (existingUsers && existingUsers.slice(1).some(user => user[1] === username)) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = [
        `USER_${Date.now()}`,
        username,
        hashedPassword,
        1000,
        new Date().toISOString()
      ];
      await appendToSheet('Users', newUser);
      return res.status(201).json({ message: 'Registration successful', userId: newUser[0] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      const users = await getSheetData('Users');
      if (users && users.length > 1) {
        if (userId) {
          const userRow = users.slice(1).find(row => row[0] === userId);
          if (userRow) {
            return res.status(200).json({ user: { userId: userRow[0], username: userRow[1], balance: parseFloat(userRow[3]) } });
          } else {
            return res.status(404).json({ message: 'User not found' });
          }
        } else {
          const publicUsers = users.slice(1).map(row => ({
            userId: row[0],
            username: row[1],
            balance: parseFloat(row[3]),
            createdAt: row[4]
          }));
          return res.status(200).json({ users: publicUsers });
        }
      }
      return res.status(200).json({ users: [] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
