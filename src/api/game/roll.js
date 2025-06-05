import { Server } from 'socket.io';
import { appendToSheet, getSheetData, updateRow, getRowById } from '@/utils/googleSheetsClient';

let io;

function rollDice() {
  const dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
  const total = dice.reduce((sum, die) => sum + die, 0);
  const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
  let outcome = '';

  if (isTriple) {
    outcome = `Bão ${dice[0]}`;
  } else if (total >= 11) {
    outcome = 'Tài';
  } else {
    outcome = 'Xỉu';
  }
  return { dice, total, outcome, isTriple };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!res.socket.server.io) {
    io = new Server(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
    });
    res.socket.server.io = io;
  } else {
    io = res.socket.server.io;
  }

  try {
    const { dice, total, outcome, isTriple } = rollDice();

    const gameHistoryData = [
      `GAME_${Date.now()}`,
      dice.join('-'),
      total,
      outcome,
      isTriple ? 'TRUE' : 'FALSE',
      new Date().toISOString(),
    ];
    await appendToSheet('GameHistory', gameHistoryData);

    const existingBets = await getSheetData('Bets');
    let updatedBetsCount = 0;

    if (existingBets && existingBets.length > 1) {
      const betsToProcess = existingBets.slice(1);

      for (let i = 0; i < betsToProcess.length; i++) {
        const row = betsToProcess[i];
        const originalSheetRowIndex = i + 2;

        const betChoice = row[4];
        const betAmount = parseFloat(row[3]);
        let isWin = false;
        let payout = 0;

        if (row[5]) continue;

        if (isTriple) {
          if (betChoice === outcome) {
            isWin = true;
            payout = betAmount * 20;
          }
        } else {
          if (betChoice === outcome) {
            isWin = true;
            payout = betAmount * 2;
          }
        }

        row[5] = dice.join('-');
        row[6] = isWin ? 'TRUE' : 'FALSE';
        row[7] = payout;

        await updateRow('Bets', originalSheetRowIndex, row);
        updatedBetsCount++;

        if (isWin) {
          const user = await getRowById('Users', 0, row[1]);
          if (user) {
            user.data[3] = parseFloat(user.data[3]) + payout;
            await updateRow('Users', user.rowIndex, user.data);
          }
        }
      }
    }

    const gameResult = { dice, total, outcome, isTriple, updatedBetsCount, timestamp: new Date().toISOString() };
    io.emit('gameUpdate', gameResult);

    res.status(200).json({
      message: `Game rolled and processed ${updatedBetsCount} bets`,
      result: gameResult,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
