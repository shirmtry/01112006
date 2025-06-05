document.getElementById("loginForm").onsubmit = async function(e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  msg.textContent = "Đang kiểm tra...";
  const res = await fetch("/api/user", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.username) {
    msg.textContent = "";
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("main").style.display = "block";
    document.getElementById("displayUser").textContent = data.username;
    document.getElementById("balance").textContent = data.balance;
  } else {
    msg.textContent = data.error || "Sai thông tin đăng nhập!";
  }
};
