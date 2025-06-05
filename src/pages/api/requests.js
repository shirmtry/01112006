import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  const { uid, type, amount } = req.body;

  await addDoc(collection(db, "requests"), {
    uid,
    type,
    amount,
    status: "pending",
    createdAt: serverTimestamp()
  });

  res.status(200).json({ message: "Yêu cầu gửi thành công" });
}
