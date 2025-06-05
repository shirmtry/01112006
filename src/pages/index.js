// src/pages/index.js
import { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { collection, addDoc, onSnapshot } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [choice, setChoice] = useState("tài");
  const [amount, setAmount] = useState(1000);
  const [latestResult, setLatestResult] = useState(null);

  useEffect(() => {
    // Theo dõi trạng thái đăng nhập
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUser(user);
      else setUser(null);
    });

    // Theo dõi kết quả game realtime
    const roundUnsub = onSnapshot(collection(db, "rounds"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      const last = data[data.length - 1];
      setLatestResult(last);
    });

    return () => {
      unsub();
      roundUnsub();
    };
  }, []);

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Đăng ký thành công!");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Đăng nhập thành công!");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleBet = async () => {
    try {
      await addDoc(collection(db, "bets"), {
        uid: user.uid,
        choice,
        amount,
        createdAt: Date.now(),
      });
      alert("Đã đặt cược!");
    } catch (err) {
      alert("Lỗi khi đặt cược: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🎲 Game Tài Xỉu</h1>

      {!user ? (
        <div>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <br />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />
          <button onClick={handleLogin}>Đăng nhập</button>
          <button onClick={handleRegister}>Đăng ký</button>
        </div>
      ) : (
        <div>
          <p>Xin chào: {user.email}</p>
          <button onClick={handleLogout}>Đăng xuất</button>

          <hr />
          <h3>Đặt cược</h3>
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="tài">Tài</option>
            <option value="xỉu">Xỉu</option>
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            placeholder="Số tiền cược"
          />
          <button onClick={handleBet}>Cược ngay</button>

          <hr />
          <h3>Kết quả mới nhất</h3>
          {latestResult ? (
            <div>
              <p>
                🎲 {latestResult.dice?.join(" + ")} ={" "}
                {latestResult.dice?.reduce((a, b) => a + b, 0)}
              </p>
              <p>Kết quả: <strong>{latestResult.result?.toUpperCase()}</strong></p>
            </div>
          ) : (
            <p>Chưa có kết quả...</p>
          )}
        </div>
      )}
    </div>
  );
}
