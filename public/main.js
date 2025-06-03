// =================== CONFIG API ====================
const API_BASE = "https://01112006.vercel.app/api";
const API_USER = `${API_BASE}/user`;
const API_REQUEST = `${API_BASE}/request`;
const API_BET = `${API_BASE}/bet`;

const ADMIN_USERNAMES = ["admin"];

// =================== HASH UTILITY ==================
function hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash.toString();
}

// =================== CAPTCHA =======================
function generateCaptcha(prefix = '') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let captcha = '';
    for (let i = 0; i < 5; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const display = document.getElementById(prefix + 'captchaDisplay');
    if (display) display.textContent = captcha;
}

// ========== INIT CAPTCHA ==========
document.addEventListener("DOMContentLoaded", () => {
    generateCaptcha();
});

// =================== UI EVENT ======================
document.getElementById('showRegisterLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("registerForm").style.display = "block";
    generateCaptcha('reg_');
});
document.getElementById('showLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("registerForm").style.display = "none";
    generateCaptcha();
});
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('current_user');
    localStorage.removeItem('is_admin');
    document.getElementById("mainContent").style.display = "none";
    document.getElementById("loginForm").style.display = "block";
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('captcha').value = '';
    if (typeof tx_interval !== "undefined" && tx_interval) clearInterval(tx_interval);
    if (typeof tx_settleTimeout !== "undefined" && tx_settleTimeout) clearTimeout(tx_settleTimeout);
    if (typeof betSyncInterval !== "undefined" && betSyncInterval) clearInterval(betSyncInterval);
    disableDepositWithdrawButtons();
});

// =================== GAME STATE ====================
let tx_stats = [];
let MAX_STATS = 20;
let tx_interval = null;
let tx_settleTimeout = null;
let betSyncInterval = null;
let userBet = { side: null, amount: 0, round: 0 };
let tx_locked = false;
let tx_round = 1; // Số thứ tự phiên chơi

// =================== ENABLE/DISABLE DEPOSIT/WITHDRAW BUTTONS ================
function enableDepositWithdrawButtons() {
    if(document.getElementById('depositBtn')) document.getElementById('depositBtn').disabled = false;
    if(document.getElementById('withdrawBtn')) document.getElementById('withdrawBtn').disabled = false;
}
function disableDepositWithdrawButtons() {
    if(document.getElementById('depositBtn')) document.getElementById('depositBtn').disabled = true;
    if(document.getElementById('withdrawBtn')) document.getElementById('withdrawBtn').disabled = true;
}

// ========== ĐĂNG KÝ ==========
document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('reg_username').value.trim();
    const password = document.getElementById('reg_password').value;
    const password2 = document.getElementById('reg_password2').value;
    const captcha = (document.getElementById('reg_captcha').value || '').trim().toUpperCase();
    const captchaCode = (document.getElementById('reg_captchaDisplay').textContent || '').trim().toUpperCase();

    if (!username || !password || !password2 || !captcha) {
        showCustomAlert('Vui lòng nhập đầy đủ thông tin.');
        return;
    }
    if (password !== password2) {
        showCustomAlert('Mật khẩu nhập lại chưa khớp!');
        return;
    }
    if (captcha !== captchaCode) {
        showCustomAlert('Mã captcha chưa đúng!');
        generateCaptcha('reg_');
        return;
    }

    try {
        const check = await fetch(`${API_USER}?username=${encodeURIComponent(username)}&t=${Date.now()}`);
        if (check.ok) {
            const found = await check.json();
            if (Array.isArray(found) && found.some(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
                showCustomAlert('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác!');
                return;
            }
            if (found && found.username && found.username.toLowerCase() === username.toLowerCase()) {
                showCustomAlert('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác!');
                return;
            }
        }
    } catch (e) {}

    let ip = "";
    try {
        const ipres = await fetch("https://api.ipify.org?format=json");
        const ipjson = await ipres.json();
        ip = ipjson.ip || "";
    } catch (e) { ip = ""; }

    try {
        const response = await fetch(API_USER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                passwordHash: hashString(password),
                ip
            })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showCustomAlert('Đăng ký thành công, bạn đã được đăng nhập!');
            localStorage.setItem('current_user', username);
            localStorage.setItem('is_admin', ADMIN_USERNAMES.includes(username) ? '1' : '');
            document.getElementById("registerForm").style.display = "none";
            document.getElementById("mainContent").style.display = "block";
            await loadUserInfo(username);
            if (ADMIN_USERNAMES.includes(username)) showAdminPanel();
            startGame();
            document.getElementById('reg_username').value = '';
            document.getElementById('reg_password').value = '';
            document.getElementById('reg_password2').value = '';
            document.getElementById('reg_captcha').value = '';
            enableDepositWithdrawButtons();
        } else {
            showCustomAlert(data.error || 'Lỗi đăng ký, thử lại sau!');
        }
    } catch (e) {
        showCustomAlert('Lỗi kết nối, thử lại sau!');
    }
});

// ========== ĐĂNG NHẬP ==========
document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const captcha = (document.getElementById('captcha').value || '').trim().toUpperCase();
    const captchaCode = (document.getElementById('captchaDisplay').textContent || '').trim().toUpperCase();

    if (!username || !password || !captcha) {
        showCustomAlert('Vui lòng điền đầy đủ thông tin đăng nhập!');
        return;
    }
    if (captcha !== captchaCode) {
        showCustomAlert('Mã captcha chưa đúng!');
        generateCaptcha();
        return;
    }

    try {
        const res = await fetch(`${API_USER}?username=${encodeURIComponent(username)}`);
        if (!res.ok) {
            showCustomAlert('Tài khoản không tồn tại!');
            return;
        }
        const user = await res.json();
        if (!user || !user.username || user.passwordHash !== hashString(password)) {
            showCustomAlert('Mật khẩu không đúng!');
            return;
        }

        let ip = "";
        try {
            const ipres = await fetch("https://api.ipify.org?format=json");
            const ipjson = await ipres.json();
            ip = ipjson.ip || "";
        } catch (e) { ip = ""; }
        try {
            await fetch(API_USER, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, ip })
            });
        } catch (e) {}

        localStorage.setItem('current_user', username);
        localStorage.setItem('is_admin', ADMIN_USERNAMES.includes(username) ? '1' : '');

        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

        await loadUserInfo(username);
        if (ADMIN_USERNAMES.includes(username)) {
            showAdminPanel();
        }
        startGame();
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('captcha').value = '';
        enableDepositWithdrawButtons();
    } catch (e) {
        showCustomAlert('Lỗi đăng nhập, thử lại sau!');
    }
});

// =================== NẠP/RÚT TIỀN ===================
async function requestDeposit(username, amount, bank_code = "", note = "") {
    try {
        const res = await fetch(API_REQUEST, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                type: "deposit",
                amount,
                bank_code,
                note
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            // Cập nhật số dư ngay (v16)
            try {
                const userRes = await fetch(`${API_USER}?username=${encodeURIComponent(username)}`);
                const user = await userRes.json();
                let balance = parseInt(user.balance || 0) + parseInt(amount);
                await fetch(API_USER, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, balance })
                });
                document.getElementById("userBalance").textContent = balance.toLocaleString();
            } catch (e) {}
            showCustomAlert("Gửi yêu cầu nạp tiền thành công! Số dư đã cộng tạm thời. Vui lòng chờ admin xác nhận.");
        } else {
            showCustomAlert(data.error || "Lỗi gửi yêu cầu nạp tiền");
        }
    } catch (e) {
        showCustomAlert("Lỗi kết nối máy chủ nạp tiền.");
    }
}

async function requestWithdraw(username, amount, bank_code = "", note = "") {
    try {
        const res = await fetch(API_REQUEST, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                type: "withdraw",
                amount,
                bank_code,
                note
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            // Trừ số dư ngay (v16)
            try {
                const userRes = await fetch(`${API_USER}?username=${encodeURIComponent(username)}`);
                const user = await userRes.json();
                let balance = parseInt(user.balance || 0) - parseInt(amount);
                await fetch(API_USER, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, balance })
                });
                document.getElementById("userBalance").textContent = balance.toLocaleString();
            } catch (e) {}
            showCustomAlert("Gửi yêu cầu rút tiền thành công! Số dư đã trừ tạm thời. Vui lòng chờ admin xác nhận.");
        } else {
            showCustomAlert(data.error || "Lỗi gửi yêu cầu rút tiền");
        }
    } catch (e) {
        showCustomAlert("Lỗi kết nối máy chủ rút tiền.");
    }
}

// ========== Sự kiện nút nạp/rút ==========
if(document.getElementById('depositBtn')) {
    document.getElementById('depositBtn').addEventListener('click', async () => {
        const username = localStorage.getItem('current_user');
        const amount = parseInt(document.getElementById('depositAmount').value);
        const bank_code = document.getElementById('depositBank') ? document.getElementById('depositBank').value : "";
        const note = document.getElementById('depositNote') ? document.getElementById('depositNote').value : "";
        if (!username || !amount || amount <= 0) {
            showCustomAlert("Vui lòng nhập số tiền muốn nạp.");
            return;
        }
        await requestDeposit(username, amount, bank_code, note);
    });
}
if(document.getElementById('withdrawBtn')) {
    document.getElementById('withdrawBtn').addEventListener('click', async () => {
        const username = localStorage.getItem('current_user');
        const amount = parseInt(document.getElementById('withdrawAmount').value);
        const bank_code = document.getElementById('withdrawBank') ? document.getElementById('withdrawBank').value : "";
        const note = document.getElementById('withdrawNote') ? document.getElementById('withdrawNote').value : "";
        if (!username || !amount || amount <= 0) {
            showCustomAlert("Vui lòng nhập số tiền muốn rút.");
            return;
        }
        await requestWithdraw(username, amount, bank_code, note);
    });
}

// =================== GAME TÀI XỈU & GIAO DIỆN ====================
// ... Phần code game giữ nguyên như cũ ...

// ========== KHỞI ĐỘNG GAME ==========
function startGame() {
    document.getElementById('dice1').textContent = '?';
    document.getElementById('dice2').textContent = '?';
    document.getElementById('dice3').textContent = '?';
    updateStatView();
    renderQuickBetButtons();
    startTXRound();
    enableDepositWithdrawButtons();
}

// ====== BỔ SUNG HÀM showCustomAlert, loadUserInfo, showAdminPanel ======
function showCustomAlert(msg) {
    alert(msg); // Bạn có thể thay thế bằng modal đẹp hơn nếu muốn
}

async function loadUserInfo(username) {
    document.getElementById("userNameDisplay").textContent = username;
    try {
        const res = await fetch(`${API_USER}?username=${encodeURIComponent(username)}`);
        if (res.ok) {
            const user = await res.json();
            document.getElementById("userBalance").textContent = (user.balance || 0).toLocaleString();
        }
    } catch (e) {
        document.getElementById("userBalance").textContent = "0";
    }
}

function showAdminPanel() {
    document.getElementById("adminPanel").style.display = "block";
}

// ========== INIT ON LOAD ==========
document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = localStorage.getItem('current_user');
    if (currentUser) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        await loadUserInfo(currentUser);
        if (localStorage.getItem('is_admin') === '1') {
            showAdminPanel();
        }
        startGame();
        enableDepositWithdrawButtons();
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        disableDepositWithdrawButtons();
    }
});
