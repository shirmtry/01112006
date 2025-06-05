import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  const { uid, roundId, choice, amount } = req.body;

  await addDoc(collection(db, "bets"), {
    uid,
    roundId,
    choice,
    amount,
    createdAt: serverTimestamp()
  });

  res.status(200).json({ message: "Đặt cược thành công" });
}
