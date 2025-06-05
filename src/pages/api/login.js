import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Đăng nhập thành công");
  };

  return (
    <div>
      <h2>Đăng nhập</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" type="password" />
      <button onClick={handleLogin}>Đăng nhập</button>
    </div>
  );
}
