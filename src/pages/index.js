import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Home() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rounds'), snapshot => {
      const data = snapshot.docs.map(doc => doc.data());
      const latest = data[data.length - 1];
      setResult(latest);
    });

    return () => unsub();
  }, []);

  return (
    <div>
      <h2>Kết quả phiên mới:</h2>
      {result && <p>{result.result} - Xúc xắc: {result.dice.join(', ')}</p>}
    </div>
  );
}
