
// ======= API CONST & UTILS =======
const API_USERS = "/api/user";
const API_REQUESTS = "/api/request";
const ADMIN_USERNAMES = ["admin"];

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

let currentCaptcha = "";
let currentCaptchaReg = "";
function generateCaptcha(prefix = '') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let captcha = '';
    for (let i = 0; i < 5; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (prefix === "reg_") {
        currentCaptchaReg = captcha;
        const regDisplay = document.getElementById('reg_captchaDisplay');
        if (regDisplay) regDisplay.textContent = captcha;
    } else {
        currentCaptcha = captcha;
        const display = document.getElementById('captchaDisplay');
        if (display) display.textContent = captcha;
    }
}

function randomCode(length = 7) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i=0; i<length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function enableDepositWithdrawButtons() {
    if(document.getElementById('openDepositPageBtn')) document.getElementById('openDepositPageBtn').disabled = false;
    if(document.getElementById('openWithdrawPageBtn')) document.getElementById('openWithdrawPageBtn').disabled = false;
}
function disableDepositWithdrawButtons() {
    if(document.getElementById('openDepositPageBtn')) document.getElementById('openDepositPageBtn').disabled = true;
    if(document.getElementById('openWithdrawPageBtn')) document.getElementById('openWithdrawPageBtn').disabled = true;
}

// ======= AUTH & USER FLOW =======
document.addEventListener("DOMContentLoaded", function() {
    generateCaptcha();
    // Auth UI Switch
    if (document.getElementById('showRegisterLink')) document.getElementById('showRegisterLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("registerForm").style.display = "block";
        generateCaptcha('reg_');
    });
    if (document.getElementById('showLoginLink')) document.getElementById('showLoginLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("registerForm").style.display = "none";
        generateCaptcha();
    });
    if (document.getElementById('logoutBtn')) document.getElementById('logoutBtn').addEventListener('click', () => {
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

    // Nạp tiền
    const openDepositBtn = document.getElementById('openDepositPageBtn');
    const depositPage = document.getElementById('depositPage');
    if (openDepositBtn && depositPage) {
        openDepositBtn.onclick = function() {
            depositPage.style.display = "flex";
            document.getElementById('depositPageAmount').value = "";
            document.getElementById('depositPageCodeTxt').textContent = "";
            document.getElementById('depositPageGenCodeBtn').disabled = true;
            document.getElementById('depositPageSubmitBtn').disabled = true;
        };
        document.getElementById('depositPageCloseBtn').onclick = function() {
            depositPage.style.display = "none";
        };
        document.getElementById('depositPageAmount').oninput = function() {
            const v = parseInt(this.value, 10);
            document.getElementById('depositPageGenCodeBtn').disabled = !(v && v >= 1000);
            document.getElementById('depositPageCodeTxt').textContent = "";
            document.getElementById('depositPageSubmitBtn').disabled = true;
        };
        document.getElementById('depositPageGenCodeBtn').onclick = function() {
            document.getElementById('depositPageCodeTxt').textContent = randomCode();
            document.getElementById('depositPageSubmitBtn').disabled = false;
        };
        document.getElementById('depositPageSubmitBtn').onclick = async function() {
            const username = localStorage.getItem('current_user');
            const amount = parseInt(document.getElementById('depositPageAmount').value);
            const code = document.getElementById('depositPageCodeTxt').textContent;
            if (!amount || isNaN(amount) || amount < 1000) {
                alert("Vui lòng nhập số tiền nạp hợp lệ (>= 1000)!");
                return;
            }
            if (!code) {
                alert("Vui lòng tạo mã chuyển khoản!");
                return;
            }
            await fetch(API_REQUESTS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    type: "deposit",
                    amount,
                    bank_code: code,
                    note: "",
                    status: "pending"
                })
            });
            alert("Gửi yêu cầu nạp tiền thành công! Vui lòng chờ admin xác nhận.");
            depositPage.style.display = "none";
            await loadUserHistory(username);
        };
    }
    // Rút tiền
    const openWithdrawBtn = document.getElementById('openWithdrawPageBtn');
    const withdrawPage = document.getElementById('withdrawPage');
    if (openWithdrawBtn && withdrawPage) {
        openWithdrawBtn.onclick = function() {
            withdrawPage.style.display = "flex";
            document.getElementById('withdrawPageBank').value = "";
            document.getElementById('withdrawPageAccount').value = "";
            document.getElementById('withdrawPageHolder').value = "";
            document.getElementById('withdrawPageAmount').value = "";
            document.getElementById('withdrawPageSubmitBtn').disabled = true;
        };
        document.getElementById('withdrawPageCloseBtn').onclick = function() {
            withdrawPage.style.display = "none";
        };
        const withdrawInputs = ['withdrawPageBank', 'withdrawPageAccount', 'withdrawPageHolder', 'withdrawPageAmount'];
        withdrawInputs.forEach(id => {
            document.getElementById(id).oninput = function() {
                const bank = document.getElementById('withdrawPageBank').value.trim();
                const acc = document.getElementById('withdrawPageAccount').value.trim();
                const holder = document.getElementById('withdrawPageHolder').value.trim();
                const amount = parseInt(document.getElementById('withdrawPageAmount').value);
                document.getElementById('withdrawPageSubmitBtn').disabled = !(bank && acc && holder && amount && amount >= 1000);
            };
        });
        document.getElementById('withdrawPageSubmitBtn').onclick = async function() {
            const username = localStorage.getItem('current_user');
            const bank = document.getElementById('withdrawPageBank').value.trim();
            const acc = document.getElementById('withdrawPageAccount').value.trim();
            const holder = document.getElementById('withdrawPageHolder').value.trim();
            const amount = parseInt(document.getElementById('withdrawPageAmount').value);
            if (!bank || !acc || !holder || !amount || isNaN(amount) || amount < 1000) {
                alert("Vui lòng nhập đầy đủ thông tin và số tiền hợp lệ (>= 1000)!");
                return;
            }
            const res = await fetch(`${API_USERS}?username=${encodeURIComponent(username)}`);
            const user = await res.json();
            if (!user || user.balance === undefined || parseInt(user.balance) < amount) {
                alert("Số dư không đủ để rút!");
                return;
            }
            await fetch(API_USERS, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, balance: parseInt(user.balance) - amount })
            });
            await fetch(API_REQUESTS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    type: "withdraw",
                    amount,
                    bank_code: "",
                    note: `Ngân hàng: ${bank}, Số TK: ${acc}, Chủ TK: ${holder}`,
                    status: "pending"
                })
            });
            alert("Gửi yêu cầu rút tiền thành công! Số dư đã trừ, vui lòng chờ xác nhận từ admin.");
            withdrawPage.style.display = "none";
            await loadUserInfo(username);
            await loadUserHistory(username);
        };
    }

    const currentUser = localStorage.getItem('current_user');
    if (currentUser) enableDepositWithdrawButtons();
    else disableDepositWithdrawButtons();
    if (localStorage.getItem('is_admin') === '1') {
        showAdminPanel();
        loadAdminRequests();
    }
});

// ======= Register/Login =======
if (document.getElementById('registerBtn')) document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('reg_username').value.trim();
    const password = document.getElementById('reg_password').value;
    const password2 = document.getElementById('reg_password2').value;
    const captcha = (document.getElementById('reg_captcha').value || '').trim().toUpperCase();
    const captchaCode = (document.getElementById('reg_captchaDisplay').textContent || '').trim().toUpperCase();

    if (!username || !password || !password2 || !captcha) {
        alert('Vui lòng nhập đầy đủ thông tin.');
        return;
    }
    if (password !== password2) {
        alert('Mật khẩu nhập lại chưa khớp!');
        return;
    }
    if (captcha !== captchaCode) {
        alert('Mã captcha chưa đúng!');
        generateCaptcha('reg_');
        return;
    }

    try {
        const check = await fetch(`${API_USERS}?username=${encodeURIComponent(username)}`);
        const found = await check.json();
        if (found && found.username && found.username.toLowerCase() === username.toLowerCase()) {
            alert('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác!');
            return;
        }
        if (Array.isArray(found) && found.some(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
            alert('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác!');
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
        await fetch(API_USERS, {
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
        alert('Đăng ký thành công, bạn đã được đăng nhập!');
        localStorage.setItem('current_user', username);
        localStorage.setItem('is_admin', ADMIN_USERNAMES.includes(username) ? '1' : '');
        document.getElementById("registerForm").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        await afterLoginOrRegister();
    } catch (e) {
        alert('Lỗi kết nối, thử lại sau!');
    }
});

if (document.getElementById('loginBtn')) document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const captcha = (document.getElementById('captcha').value || '').trim().toUpperCase();
    const captchaCode = (document.getElementById('captchaDisplay').textContent || '').trim().toUpperCase();

    if (!username || !password || !captcha) {
        alert('Vui lòng điền đầy đủ thông tin đăng nhập!');
        return;
    }
    if (captcha !== captchaCode) {
        alert('Mã captcha chưa đúng!');
        generateCaptcha();
        return;
    }

    try {
        const res = await fetch(`${API_USERS}?username=${encodeURIComponent(username)}`);
        if (!res.ok) {
            alert('Lỗi máy chủ, thử lại sau!');
            return;
        }
        const user = await res.json();
        if (!user || !user.passwordHash) {
            alert('Tài khoản không tồn tại hoặc có dữ liệu lỗi!');
            return;
        }
        if (user.passwordHash != hashString(password)) {
            alert('Mật khẩu không đúng!');
            return;
        }
        localStorage.setItem('current_user', username);
        localStorage.setItem('is_admin', ADMIN_USERNAMES.includes(username) ? '1' : '');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        await afterLoginOrRegister();
    } catch (e) {
        alert('Lỗi đăng nhập, thử lại sau!');
    }
});

// ======= User/History/Admin =======
async function loadUserHistory(username) {
    try {
        const res = await fetch(`${API_REQUESTS}?username=${encodeURIComponent(username)}`);
        const history = await res.json();
        let html = '';
        if (Array.isArray(history) && history.length > 0 && history.some(item => item.timestamp || item.amount || item.bank_code)) {
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

async function loadUserInfo(username) {
    if (document.getElementById("userNameDisplay")) document.getElementById("userNameDisplay").textContent = username;
    try {
        const res = await fetch(`${API_USERS}?username=${encodeURIComponent(username)}`);
        const user = await res.json();
        if (user && user.balance !== undefined && document.getElementById("userBalance")) {
            document.getElementById("userBalance").textContent = (user.balance || 0).toLocaleString();
        }
    } catch (e) {
        if (document.getElementById("userBalance")) document.getElementById("userBalance").textContent = "0";
    }
}

async function loadAdminRequests() {
    if (!document.getElementById('adminRequests')) return;
    try {
        const res = await fetch(`${API_REQUESTS}?type=deposit&status=pending`);
        const requests = await res.json();
        let html = '';
        if (Array.isArray(requests) && requests.length) {
            requests.forEach((req) => {
                html += `<li>
                    <b>${req.username}</b> - ${req.amount.toLocaleString()} VNĐ - Mã: ${req.bank_code}
                    <button class="admin-confirm-deposit" data-id="${req._id}" data-username="${req.username}" data-amount="${req.amount}">Xác nhận</button>
                </li>`;
            });
        } else {
            html = '<li>Không có yêu cầu nạp tiền chờ duyệt.</li>';
        }
        document.getElementById('adminRequests').innerHTML = html;
        document.querySelectorAll('.admin-confirm-deposit').forEach(btn => {
            btn.onclick = async function() {
                const id = this.getAttribute('data-id');
                const username = this.getAttribute('data-username');
                const amount = parseInt(this.getAttribute('data-amount'));
                await adminConfirmDeposit(id, username, amount);
            };
        });
    } catch (e) {
        document.getElementById('adminRequests').innerHTML = '<li>Lỗi tải danh sách yêu cầu.</li>';
    }
}

async function adminConfirmDeposit(requestId, username, amount) {
    try {
        const res = await fetch(`${API_USERS}?username=${encodeURIComponent(username)}`);
        const user = await res.json();
        if (!user || !user.username) {
            alert("Không tìm thấy user.");
            return;
        }
        const newBalance = parseInt(user.balance || 0) + parseInt(amount);
        await fetch(API_USERS, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, balance: newBalance })
        });
        await fetch(`${API_REQUESTS}/${requestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "done" })
        });
        alert(`Đã cộng ${amount.toLocaleString()} VNĐ cho user ${username}`);
        loadAdminRequests();
    } catch (e) {
        alert("Lỗi xác nhận nạp tiền.");
    }
}

function showAdminPanel() {
    if (document.getElementById("adminPanel")) document.getElementById("adminPanel").style.display = "block";
}

async function afterLoginOrRegister() {
    const username = localStorage.getItem('current_user');
    await loadUserInfo(username);
    enableDepositWithdrawButtons();
    await loadUserHistory(username);
    startTimer();
}

// ======= Game Logic =======
const BET_AMOUNTS_MD5 = [1000, 5000, 10000, 50000, 100000, 500000, 1000000, 10000000];
let round = 1;
let timer = 30;
let interval;
let betSide = "tai";
let userBets = { tai: 0, xiu: 0 };
let totalTai = 458462000;
let totalXiu = 483611000;
let resultHistory = [];
let dialNum = 12;
let nanActive = false;

// 3D Dice support (optional, insert in UI if needed)
function roll3DDice(face, el) {
    if (!el) return;
    const rotations = [
        { x: 0, y: 0 },
        { x: -90, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: -90 },
        { x: 0, y: 90 },
        { x: 90, y: 0 },
        { x: 180, y: 0 }
    ];
    let r = rotations[face];
    el.style.transform = `rotateX(${r.x}deg) rotateY(${r.y}deg)`;
    el.setAttribute("data-face", face);
}

function updateBoard() {
    if (document.getElementById("tx-round-id")) document.getElementById("tx-round-id").textContent = round;
    if (document.getElementById("tx-timer")) document.getElementById("tx-timer").textContent = timer;
    if (document.getElementById("tx-tai-total")) document.getElementById("tx-tai-total").textContent = totalTai.toLocaleString();
    if (document.getElementById("tx-xiu-total")) document.getElementById("tx-xiu-total").textContent = totalXiu.toLocaleString();
    if (document.getElementById("tx-bet-amount")) document.getElementById("tx-bet-amount").value = userBets[betSide] || 0;
    updateDial(dialNum);
    updateResultList();
    if (document.getElementById("tx-tai-select")) document.getElementById("tx-tai-select").classList.toggle("selected", betSide === "tai");
    if (document.getElementById("tx-xiu-select")) document.getElementById("tx-xiu-select").classList.toggle("selected", betSide === "xiu");
}

function updateResultList() {
    const el = document.getElementById("tx-result-list");
    if (!el) return;
    el.innerHTML = resultHistory.slice(-15).map(x =>
        `<span class="tx-result-ball ${x.result}">${x.sum}</span>`
    ).join("");
}

function updateDial(num) {
    const dial = document.getElementById("tx-dial");
    const dialNumEl = document.getElementById("tx-dial-num");
    if (!dial || !dialNumEl) return;
    dialNumEl.textContent = num;
    let deg = ((num-3)/15) * 360;
    dial.style.transform = `rotate(${deg}deg)`;
}

function startTimer() {
    timer = 30;
    updateBoard();
    clearInterval(interval);
    interval = setInterval(()=>{
        timer--;
        if(document.getElementById("tx-timer")) document.getElementById("tx-timer").textContent = timer;
        if(timer <= 0) {
            clearInterval(interval);
            settleRound();
        }
    }, 1000);
}

function settleRound() {
    let dice = nanActive ? nanningDice() : [randDice(), randDice(), randDice()];
    let sum = dice[0]+dice[1]+dice[2];
    let result = sum >= 11 && sum <= 17 ? "tai" : "xiu";
    dialNum = sum;
    updateDial(sum);

    resultHistory.unshift({sum, result});
    if(resultHistory.length>30) resultHistory.length=30;
    updateResultList();

    totalTai += userBets["tai"];
    totalXiu += userBets["xiu"];
    userBets = { tai: 0, xiu: 0 };
    nanActive = false;

    setTimeout(()=>{
        round++;
        dialNum = 12;
        startTimer();
        if(document.getElementById("tx-bet-btn")) document.getElementById("tx-bet-btn").disabled = false;
        if(document.getElementById("tx-nan-btn")) document.getElementById("tx-nan-btn").disabled = false;
    }, 3200);
}

function randDice() {
    return Math.floor(Math.random()*6)+1;
}

function nanningDice() {
    let sum = Math.floor(Math.random()*9)+8;
    for(let i=1;i<=6;i++){
        for(let j=1;j<=6;j++){
            let k=sum-i-j;
            if(k>=1&&k<=6) return [i,j,k];
        }
    }
    return [6,6,6];
}

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById("tx-bet-btn")) document.getElementById("tx-bet-btn").onclick = function() {
        let amt = parseInt(document.getElementById("tx-bet-amount").value);
        if(isNaN(amt)||amt<=0) {
            alert("Vui lòng nhập số tiền cược > 0");
            return;
        }
        userBets[betSide] += amt;
        document.getElementById("tx-bet-amount").value = userBets[betSide];
        this.disabled = true;
        if(document.getElementById("tx-nan-btn")) document.getElementById("tx-nan-btn").disabled = true;
        alert(`Đã cược ${amt.toLocaleString()} vào ${betSide.toUpperCase()}`);
    };

    if(document.getElementById("tx-nan-btn")) document.getElementById("tx-nan-btn").onclick = function() {
        if(nanActive){
            alert("Bạn đã nện rồi!");
            return;
        }
        nanActive = true;
        alert("Bạn đã nện! Tổng sẽ được nện khi hết phiên.");
        this.disabled = true;
    };

    document.querySelectorAll(".tx-quick-btn").forEach(btn=>{
        btn.onclick = function() {
            document.getElementById("tx-bet-amount").value = parseInt(this.dataset.amount);
        };
    });

    if(document.getElementById("tx-tai-select")) document.getElementById("tx-tai-select").onclick = function() {
        betSide = "tai";
        updateBoard();
    };
    if(document.getElementById("tx-xiu-select")) document.getElementById("tx-xiu-select").onclick = function() {
        betSide = "xiu";
        updateBoard();
    };

    if(document.getElementById("tx-copy-btn")) document.getElementById("tx-copy-btn").onclick = function() {
        let txt = resultHistory.slice(0,20).map(x=>x.sum).join(" - ");
        navigator.clipboard.writeText(txt);
        alert("Đã copy kết quả!");
    };

    if(document.getElementById("tx-main-container") || document.getElementById("tx-dial")) {
        updateBoard();
        startTimer();
    }
});
