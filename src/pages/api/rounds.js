// Random kết quả mỗi 60 giây và lưu vào Firestore
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

let timerSet = false;

export default async function handler(req, res) {
  if (!timerSet) {
    setInterval(async () => {
      const dice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ];
      const total = dice.reduce((a, b) => a + b);
      const result = total >= 11 ? "tài" : "xỉu";

      await addDoc(collection(db, "rounds"), {
        dice,
        result,
        createdAt: Date.now(),
      });

      console.log("Kết quả mới:", result);
    }, 60000); // mỗi 60 giây
    timerSet = true;
  }

  res.status(200).json({ message: "Timer đang chạy..." });
}
