let mode = "login";
const form = document.getElementById("authForm");
const msg = document.getElementById("msg");
const switchBtn = document.getElementById("switchBtn");
const formTitle = document.getElementById("form-title");
const authBtn = document.getElementById("authBtn");

switchBtn.onclick = () => {
  mode = mode === "login" ? "signup" : "login";
  formTitle.textContent = mode === "login" ? "Đăng nhập" : "Đăng ký";
  authBtn.textContent = mode === "login" ? "Đăng nhập" : "Đăng ký";
  switchBtn.textContent =
    mode === "login"
      ? "Chưa có tài khoản? Đăng ký"
      : "Đã có tài khoản? Đăng nhập";
  msg.textContent = "";
};

form.onsubmit = async function (e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  msg.style.color = "red";
  msg.textContent = mode === "login" ? "Đang đăng nhập..." : "Đang đăng ký...";

  let res, data;
  if (mode === "login") {
    try {
      res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      data = await res.json();
      if (res.ok && data.username) {
        document.getElementById("main").style.display = "block";
        document.getElementById("authForm").style.display = "none";
        switchBtn.style.display = "none";
        document.getElementById("displayUser").textContent = data.username;
        document.getElementById("balance").textContent = data.balance;
        msg.textContent = "";
      } else {
        msg.textContent = data.error || "Sai thông tin đăng nhập!";
      }
    } catch (err) {
      msg.textContent = "Lỗi kết nối server!";
    }
  } else {
    try {
      res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      data = await res.json();
      if (res.ok && data.success) {
        msg.style.color = "#006400";
        msg.textContent = "Đăng ký thành công! Mời đăng nhập.";
        mode = "login";
        formTitle.textContent = "Đăng nhập";
        authBtn.textContent = "Đăng nhập";
        switchBtn.textContent = "Chưa có tài khoản? Đăng ký";
      } else {
        msg.textContent = data.error || "Lỗi đăng ký!";
      }
    } catch (err) {
      msg.textContent = "Lỗi kết nối server!";
    }
  }
};
