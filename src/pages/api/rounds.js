import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  const dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
  const total = dice.reduce((a, b) => a + b, 0);
  const result = total >= 11 ? "tài" : "xỉu";

  await addDoc(collection(db, "rounds"), {
    dice,
    result,
    createdAt: serverTimestamp(),
    expiredAt: Date.now() + 15000 // 15 giây sau kết thúc
  });

  res.status(200).json({ dice, result });
}
