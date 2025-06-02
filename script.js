// Gọi sheet.best trực tiếp từ frontend (thay YOUR_SHEET_ID bằng ID thật)
const SHEET_BEST_URL = 'https://sheet.best/api/sheets/fd4ba63c-30b3-4a3d-b183-c82fa9f03cbb';

const form = document.getElementById('betForm');
const betList = document.getElementById('betList');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const side = document.getElementById('side').value.trim();
  const amount = document.getElementById('amount').value.trim();
  if (!username || !side || !amount) return;

  await fetch(SHEET_BEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp: Date.now(), username, side, amount }),
  });

  form.reset();
  loadBets();
});

async function loadBets() {
  betList.innerHTML = '';
  const res = await fetch(SHEET_BEST_URL);
  const data = await res.json();
  data.reverse().forEach(bet => {
    const li = document.createElement('li');
    li.textContent = `${bet.username} bet ${bet.amount} on ${bet.side}`;
    betList.appendChild(li);
  });
}

loadBets();
