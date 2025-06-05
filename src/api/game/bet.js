import { appendToSheet, getRowById, updateRow } from '@/utils/googleSheetsClient';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userId, username, betAmount, betChoice } = req.body;
    if (!userId || !username || !betAmount || !betChoice) {
      return res.status(400).json({ message: 'Missing bet details' });
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid bet amount' });
    }

    try {
      const user = await getRowById('Users', 0, userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let currentBalance = parseFloat(user.data[3]);
      if (currentBalance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      user.data[3] = currentBalance - amount;
      await updateRow('Users', user.rowIndex, user.data);

      const betData = [
        `BET_${Date.now()}_${userId}`,
        userId,
        username,
        amount,
        betChoice,
        '',
        '',
        '',
        new Date().toISOString(),
      ];
      await appendToSheet('Bets', betData);

      return res.status(200).json({ message: 'Bet placed successfully!', newBalance: user.data[3] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to place bet', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
