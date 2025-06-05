// Nhận cược từ client và lưu vào Firestore
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { uid, amount, choice } = req.body;

  await addDoc(collection(db, 'bets'), {
    uid,
    amount,
    choice,
    createdAt: Date.now()
  });

  res.status(200).json({ message: "Bet placed!" });
}
