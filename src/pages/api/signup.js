import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      email,
      balance: 50000,
      role: "user",
      ip: "unknown", // Có thể lấy IP qua API khác
      createdAt: serverTimestamp(),
    });

    alert("Đăng ký thành công");
  };

  return (
    <div>
      <h2>Đăng ký</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" type="password" />
      <button onClick={handleSignUp}>Đăng ký</button>
    </div>
  );
}
