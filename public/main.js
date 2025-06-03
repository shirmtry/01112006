// =================== CONFIG ====================
const SHEETBEST_API = "https://api.sheetbest.com/sheets/fd4ba63c-30b3-4a3d-b183-c82fa9f03cbb";
const SHEETBEST_USERS = SHEETBEST_API + "/users";
const SHEETBEST_REQUESTS = SHEETBEST_API + "/requests";
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
    if (prefix === 'reg_') {
        const regDisplay = document.getElementById('reg_captchaDisplay');
        if (regDisplay) regDisplay.textContent = captcha;
    }
}
document.addEventListener("DOMContentLoaded", function() {
    generateCaptcha();
    const loginCaptcha = document.getElementById('captchaDisplay');
    if (loginCaptcha) loginCaptcha.onclick = function() { generateCaptcha(); }
    const regCaptcha = document.getElementById('reg_captchaDisplay');
    if (regCaptcha) regCaptcha.onclick = function() { generateCaptcha('reg_'); }
});

// =================== ENABLE/DISABLE DEPOSIT/WITHDRAW BUTTONS ================
function enableDepositWithdrawButtons() {
    if(document.getElementById('depositBtn')) document.getElementById('depositBtn').disabled = false;
    if(document.getElementById('withdrawBtn')) document.getElementById('withdrawBtn').disabled = false;
}
function disableDepositWithdrawButtons() {
    if(document.getElementById('depositBtn')) document.getElementById('depositBtn').disabled = true;
    if(document.getElementById('withdrawBtn')) document.getElementById('withdrawBtn').disabled = true;
}

// =================== TẠO CODE GIAO DỊCH ===================
function randomCode(length = 7) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i=0; i<length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// =================== ĐĂNG KÝ/ĐĂNG NHẬP ===================
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
    disableDepositWithdrawButtons();
    document.getElementById("userHistoryTableBody").innerHTML = '<tr><td colspan="4">Chưa có dữ liệu</td></tr>';
});

// Đăng ký
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

    // Kiểm tra trùng username
    try {
        const check = await fetch(`${SHEETBEST_USERS}?username=${encodeURIComponent(username)}`);
        const found = await check.json();
        if (Array.isArray(found) && found.some(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
            showCustomAlert('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác!');
            return;
        }
    } catch (e) {}

    let ip = "";
    try {
        const ipres = await fetch("https://api.ipify.org?format=json");
        const ipjson = await ipres.json();
        ip = ipjson.ip || "";
    } catch (e) { ip = ""; }

    try {
        await fetch(SHEETBEST_USERS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                passwordHash: hashString(password),
                balance: 0,
                ip,
                role: "user"
            })
        });
        showCustomAlert('Đăng ký thành công, bạn đã được đăng nhập!');
        localStorage.setItem('current_user', username);
        localStorage.setItem('is_admin', ADMIN_USERNAMES.includes(username) ? '1' : '');
        document.getElementById("registerForm").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        await afterLoginOrRegister();
    } catch (e) {
        showCustomAlert('Lỗi kết nối, thử lại sau!');
    }
});

// Đăng nhập
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
        const res = await fetch(`${SHEETBEST_USERS}?username=${encodeURIComponent(username)}`);
        const users = await res.json();
        const user = users && users.find(u => u.username === username);
        if (!user || user.passwordHash !== hashString(password)) {
            showCustomAlert('Tài khoản hoặc mật khẩu không đúng!');
            return;
        }
        localStorage.setItem('current_user', username);
        localStorage.setItem('is_admin', ADMIN_USERNAMES.includes(username) ? '1' : '');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        await afterLoginOrRegister();
    } catch (e) {
        showCustomAlert('Lỗi đăng nhập, thử lại sau!');
    }
});

// =================== NẠP/RÚT TIỀN ===================
async function requestDeposit(username, amount) {
    const code = randomCode();
    try {
        if (!username) {
            showCustomAlert("Bạn chưa đăng nhập!");
            return;
        }
        if (!amount || isNaN(amount) || amount < 1000) {
            showCustomAlert("Vui lòng nhập số tiền nạp hợp lệ (>= 1000)!");
            return;
        }
        await fetch(SHEETBEST_REQUESTS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
                username,
                type: "deposit",
                amount,
                status: "pending",
                bank_code: code,
                note: ""
            })
        });
        // Cộng tạm số dư user
        const res = await fetch(`${SHEETBEST_USERS}?username=${encodeURIComponent(username)}`);
        const users = await res.json();
        if(users && users[0]) {
            let balance = parseInt(users[0].balance || 0) + parseInt(amount);
            await fetch(SHEETBEST_USERS, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ username, balance })
            });
            document.getElementById("userBalance").textContent = balance.toLocaleString();
        }
        showCustomAlert(`Gửi yêu cầu nạp tiền thành công!\nMã giao dịch: ${code}\nSố dư đã cộng tạm thời. Vui lòng chờ admin xác nhận.`);
        await loadUserHistory(username);
    } catch (e) {
        showCustomAlert("Lỗi kết nối máy chủ nạp tiền.");
    }
}

async function requestWithdraw(username, amount) {
    const code = randomCode();
    try {
        if (!username) {
            showCustomAlert("Bạn chưa đăng nhập!");
            return;
        }
        if (!amount || isNaN(amount) || amount < 1000) {
            showCustomAlert("Vui lòng nhập số tiền rút hợp lệ (>= 1000)!");
            return;
        }
        await fetch(SHEETBEST_REQUESTS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
                username,
                type: "withdraw",
                amount,
                status: "pending",
                bank_code: code,
                note: ""
            })
        });
        // Trừ tạm số dư user
        const res = await fetch(`${SHEETBEST_USERS}?username=${encodeURIComponent(username)}`);
        const users = await res.json();
        if(users && users[0]) {
            let balance = parseInt(users[0].balance || 0) - parseInt(amount);
            await fetch(SHEETBEST_USERS, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ username, balance })
            });
            document.getElementById("userBalance").textContent = balance.toLocaleString();
        }
        showCustomAlert(`Gửi yêu cầu rút tiền thành công!\nMã giao dịch: ${code}\nSố dư đã trừ tạm thời. Vui lòng chờ admin xác nhận.`);
        await loadUserHistory(username);
    } catch (e) {
        showCustomAlert("Lỗi kết nối máy chủ rút tiền.");
    }
}

// ========== Sự kiện nút nạp/rút ==========
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = localStorage.getItem('current_user');
    if (currentUser) enableDepositWithdrawButtons();
    else disableDepositWithdrawButtons();

    const depositBtn = document.getElementById('depositBtn');
    if (depositBtn) {
        depositBtn.addEventListener('click', function() {
            const username = localStorage.getItem('current_user');
            const amount = parseInt(document.getElementById('depositAmount').value);
            requestDeposit(username, amount);
        });
    }

    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', function() {
            const username = localStorage.getItem('current_user');
            const amount = parseInt(document.getElementById('withdrawAmount').value);
            requestWithdraw(username, amount);
        });
    }
});

// =================== LỊCH SỬ GIAO DỊCH USER ===================
async function loadUserHistory(username) {
    try {
        const res = await fetch(`${SHEETBEST_REQUESTS}?username=${encodeURIComponent(username)}`);
        const history = await res.json();
        let html = '';
        if (history && history.length > 0 && history.some(item => item.timestamp || item.amount || item.bank_code)) {
            history.reverse().forEach(item => {
                html += `<tr>
                    <td>${item.timestamp || ""}</td>
                    <td>${item.type === "deposit" ? "Nạp" : (item.type === "withdraw" ? "Rút" : (item.type || ''))}</td>
                    <td>${item.amount || ""}</td>
                    <td>${item.bank_code || ""}</td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="4">Chưa có dữ liệu</td></tr>';
        }
        document.getElementById("userHistoryTableBody").innerHTML = html;
    } catch (e) {
        document.getElementById("userHistoryTableBody").innerHTML = '<tr><td colspan="4">Không tải được dữ liệu</td></tr>';
    }
}

// =================== GAME TÀI XỈU ===================

// --- Cấu hình game ---
const BET_AMOUNTS = [1000, 10000, 100000, 500000, 5000000, 10000000, 50000000];
const GAME_BET_TIME = 30; // giây mỗi phiên

let gameState = {
    round: 1,
    timeLeft: GAME_BET_TIME,
    isBetting: true,
    bets: { tai: 0, xiu: 0 },
    userBets: { tai: 0, xiu: 0 },
    dice: [1, 1, 1],
    history: [],
    userHistory: []
};
let gameInterval = null;

// --- Random xúc xắc 1-6 ---
function randomDice() {
    return Math.floor(Math.random() * 6) + 1;
}

// --- Hiển thị xúc xắc ---
function renderDice(diceArr) {
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`dice${i}`).textContent = diceArr[i-1];
    }
}

// --- Hiển thị tổng cược bàn và cược người dùng ---
function renderBets() {
    document.getElementById('tx-total-tai').textContent = gameState.bets.tai.toLocaleString();
    document.getElementById('tx-total-xiu').textContent = gameState.bets.xiu.toLocaleString();
}

// --- Hiện các nút tắt đặt cược ---
function renderQuickBets() {
    const group = document.getElementById('quickBetGroup');
    group.innerHTML = BET_AMOUNTS.map(v =>
        `<button type="button" class="quick-bet-btn" data-amount="${v}">${v >= 1000000 ? (v/1000000)+'m' : (v/1000)+'k'}</button>`
    ).join('');
    group.querySelectorAll('.quick-bet-btn').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('betAmount').value = btn.dataset.amount;
        };
    });
}

// --- Reset cược user mỗi phiên ---
function resetUserBets() {
    gameState.userBets = { tai: 0, xiu: 0 };
    document.getElementById('betTai').disabled = false;
    document.getElementById('betXiu').disabled = false;
}

// --- Đặt cược ---
function placeBet(side) {
    if (!gameState.isBetting) {
        showCustomAlert('Hết thời gian đặt cược!');
        return;
    }
    const amount = parseInt(document.getElementById('betAmount').value);
    if (!amount || isNaN(amount) || amount < 1000) {
        showCustomAlert('Số tiền cược không hợp lệ!');
        return;
    }
    if (amount > parseInt(document.getElementById("userBalance").textContent.replace(/,/g,''))) {
        showCustomAlert('Không đủ số dư để cược!');
        return;
    }
    gameState.userBets[side] += amount;
    gameState.bets[side] += amount;
    document.getElementById('betTai').disabled = true;
    document.getElementById('betXiu').disabled = true;
    renderBets();
    showCustomAlert(`Đã đặt cược ${side.toUpperCase()} ${amount.toLocaleString()} VNĐ cho phiên #${gameState.round}`);
}

// --- Chạy đếm ngược/bắt đầu phiên ---
function startGameTX() {
    renderQuickBets();
    resetUserBets();
    gameState.timeLeft = GAME_BET_TIME;
    gameState.isBetting = true;
    document.getElementById('countdown').textContent = gameState.timeLeft;
    renderBets();
    renderDice(['?','?','?']);
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        gameState.timeLeft -= 1;
        document.getElementById('countdown').textContent = gameState.timeLeft;
        if (gameState.timeLeft === 0) {
            clearInterval(gameInterval);
            settleGameTX();
        }
    }, 1000);
}

// --- Quay xúc xắc, tính kết quả, cập nhật lịch sử ---
function settleGameTX() {
    gameState.isBetting = false;
    let dice = [randomDice(), randomDice(), randomDice()];
    let sum = dice[0] + dice[1] + dice[2];
    let result = sum >= 11 && sum <= 17 ? 'tai' : 'xiu';
    gameState.dice = dice;
    renderDice(dice);

    gameState.history.unshift({
        round: gameState.round,
        dice: [...dice],
        sum,
        result
    });
    if (gameState.history.length > 20) gameState.history.length = 20;
    renderHistory();

    if (gameState.userBets.tai > 0 || gameState.userBets.xiu > 0) {
        let win = 0;
        let lose = 0;
        if (gameState.userBets[result] > 0) win += gameState.userBets[result];
        if (gameState.userBets[result === 'tai' ? 'xiu' : 'tai'] > 0) lose += gameState.userBets[result === 'tai' ? 'xiu' : 'tai'];
        let time = new Date().toLocaleString('vi-VN', { hour12: false });
        gameState.userHistory.unshift({
            time,
            bet: {...gameState.userBets},
            result: result.toUpperCase(),
            sum,
            win,
            lose
        });
        if (gameState.userHistory.length > 20) gameState.userHistory.length = 20;
        renderUserBetHistory();
        let balance = parseInt(document.getElementById("userBalance").textContent.replace(/,/g,''));
        balance = balance + win - lose;
        document.getElementById("userBalance").textContent = balance.toLocaleString();
    }
    setTimeout(() => {
        gameState.round++;
        gameState.bets = { tai: 0, xiu: 0 };
        startGameTX();
    }, 5000);
}

// --- Hiển thị lịch sử bàn ---
function renderHistory() {
    let html = '';
    gameState.history.forEach(h => {
        html += `<div>Phiên ${h.round}: [${h.dice.join(', ')}] - Tổng:${h.sum} - ${h.result.toUpperCase()}</div>`;
    });
    document.getElementById('tx-stat-list').innerHTML = html;
}

// --- Hiển thị lịch sử cược user ---
function renderUserBetHistory() {
    let html = '';
    gameState.userHistory.forEach(h => {
        html += `<tr>
            <td>${h.time}</td>
            <td>${h.bet.tai > 0 ? 'Tài' : 'Xỉu'}</td>
            <td>${h.result}</td>
            <td>${h.sum}</td>
            <td>${h.win > 0 ? '+ ' + h.win.toLocaleString() : (h.lose>0 ? '- ' + h.lose.toLocaleString() : '0')}</td>
        </tr>`;
    });
    document.querySelector('#userStatsTable tbody').innerHTML = html;
}

// --- Sự kiện đặt cược ---
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('betTai'))
        document.getElementById('betTai').onclick = function() { placeBet('tai'); };
    if (document.getElementById('betXiu'))
        document.getElementById('betXiu').onclick = function() { placeBet('xiu'); };
    if (document.getElementById('placeBetBtn'))
        document.getElementById('placeBetBtn').onclick = function() {
            let group = document.getElementById('quickBetGroup');
            group.style.display = (group.style.display === 'block' ? 'none' : 'block');
        };
    if (document.getElementById('tx-game-container')) {
        startGameTX();
    }
});

// =================== CÁC HÀM HỖ TRỢ ===================
function showCustomAlert(msg) {
    alert(msg);
}

async function loadUserInfo(username) {
    document.getElementById("userNameDisplay").textContent = username;
    try {
        const res = await fetch(`${SHEETBEST_USERS}?username=${encodeURIComponent(username)}`);
        const users = await res.json();
        if (users && users[0]) {
            document.getElementById("userBalance").textContent = (users[0].balance || 0).toLocaleString();
        }
    } catch (e) {
        document.getElementById("userBalance").textContent = "0";
    }
}

fun