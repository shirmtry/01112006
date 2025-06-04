// ==================== API CONFIG ====================
const API_USERS = "/api/user";
const API_REQUESTS = "/api/request";
const API_BETS = "/api/bet";
const ADMIN_USERNAMES = ["admin"];

// ==================== UTILS ====================
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

// ==================== GAME STATE ====================
let round = 1;
let timer = 30;
let interval;
let betSide = "tai";
let quickBetAmount = 0;
let userBets = { tai: 0, xiu: 0 };
let totalTai = 0;
let totalXiu = 0;
let resultHistory = [];
let dialNum = 12;
let nanActive = false;
const BET_AMOUNTS = [1000, 10000, 100000, 500000, 5000000, 10000000, 50000000];

// ==================== MAIN ====================
document.addEventListener("DOMContentLoaded", function() {
    generateCaptcha();
    document.body.classList.add('loaded');

    // Form chuyển đổi
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

    // Đăng xuất
    if (document.getElementById('logoutBtn')) document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('current_user');
        localStorage.removeItem('is_admin');
        document.getElementById("mainContent").style.display = "none";
        document.getElementById("authWrapper").style.display = "flex";
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("registerForm").style.display = "none";
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('captcha').value = '';
        disableDepositWithdrawButtons();
        document.getElementById("userHistoryTableBody").innerHTML = '<tr><td colspan="4">Chưa có dữ liệu</td></tr>';
        document.querySelector('#userStatsTable tbody').innerHTML = '<tr><td colspan="5">Chưa có dữ liệu</td></tr>';
    });

    // Đăng ký
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

        // Kiểm tra tài khoản đã tồn tại chưa
        try {
            const check = await fetch(`${API_USERS}?username=${encodeURIComponent(username)}`);
            const found = await check.json();
            if ((found && found.username && found.username.toLowerCase() === username.toLowerCase()) ||
                (Array.isArray(found) && found.some(u => u.username && u.username.toLowerCase() === username.toLowerCase()))
            ) {
                alert('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác!');
                return;
            }
        } catch (e) {}

        try {
            await fetch(API_USERS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    passwordHash: hashString(password),
                    balance: 0,
                    role: "user"
                })
            });
            alert('Đăng ký thành công, bạn đã được đăng nhập!');
            localStorage.setItem('current_user', username);
            document.getElementById("registerForm").style.display = "none";
            document.getElementById("mainContent").style.display = "block";
            document.getElementById("authWrapper").style.display = "none";
            document.getElementById("userNameDisplay").textContent = username;
            enableDepositWithdrawButtons();
            await loadUserInfo(username);
            await loadUserBetHistory(username);
            await loadUserHistory(username);
        } catch (e) {
            alert('Lỗi kết nối, thử lại sau!');
        }
    });

    // Đăng nhập
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
            // Phòng trường hợp API trả về object hoặc array
            let u = user;
            if (Array.isArray(user)) u = user.find(x => x.username && x.username === username);
            if (!u || !u.passwordHash) {
                alert('Tài khoản không tồn tại hoặc có dữ liệu lỗi!');
                return;
            }
            if (u.passwordHash != hashString(password)) {
                alert('Mật khẩu không đúng!');
                return;
            }
            localStorage.setItem('current_user', username);
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById("authWrapper").style.display = "none";
            document.getElementById("userNameDisplay").textContent = username;
            enableDepositWithdrawButtons();
            await loadUserInfo(username);
            await loadUserBetHistory(username);
            await loadUserHistory(username);
        } catch (e) {
            alert('Lỗi đăng nhập, thử lại sau!');
        }
    });

    // Deposit popup
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
                    status: "pending",
                    timestamp: new Date().toLocaleString()
                })
            });
            alert("Gửi yêu cầu nạp tiền thành công! Vui lòng chờ admin xác nhận.");
            depositPage.style.display = "none";
            await loadUserHistory(username);
        };
    }

    // Withdraw popup
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
                    status: "pending",
                    timestamp: new Date().toLocaleString()
                })
            });
            alert("Gửi yêu cầu rút tiền thành công! Số dư đã trừ, vui lòng chờ xác nhận từ admin.");
            withdrawPage.style.display = "none";
            await loadUserInfo(username);
            await loadUserHistory(username);
        };
    }

    // Kết quả toàn phiên (popup)
    if (document.getElementById('openResultHistoryBtn')) {
        document.getElementById('openResultHistoryBtn').onclick = async function() {
            let results = await fetch('/api/bet/all').then(r=>r.json());
            renderResultHistoryDiv(results);
            document.getElementById('resultHistoryPage').style.display = "flex";
        }
    }
    if (document.getElementById('resultHistoryPageCloseBtn')) {
        document.getElementById('resultHistoryPageCloseBtn').onclick = function() {
            document.getElementById('resultHistoryPage').style.display = "none";
        };
    }

    // Game board event listeners
    document.querySelectorAll(".tx-quick-btn").forEach(btn=>{
        btn.onclick = function() {
            document.getElementById("tx-bet-amount").value = parseInt(this.dataset.amount);
            document.querySelectorAll(".tx-quick-btn").forEach(b=>b.classList.remove("selected"));
            this.classList.add("selected");
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
    if(document.getElementById("tx-bet-btn")) document.getElementById("tx-bet-btn").onclick = function() {
        let amt = parseInt(document.getElementById("tx-bet-amount").value);
        if(isNaN(amt)||amt<=0) {
            alert("Vui lòng nhập số tiền cược > 0");
            return;
        }
        userBets[betSide] += amt;
        if (betSide === "tai") totalTai += amt;
        if (betSide === "xiu") totalXiu += amt;
        document.getElementById("tx-bet-amount").value = userBets[betSide];
        updateBoard();
        this.disabled = true;
        alert(`Đã cược ${amt.toLocaleString()} vào ${betSide.toUpperCase()}`);
    };
    if(document.getElementById("tx-copy-btn")) document.getElementById("tx-copy-btn").onclick = function() {
        let txt = resultHistory.slice(0,20).map(x=>x.sum).join(" - ");
        navigator.clipboard.writeText(txt);
        alert("Đã copy kết quả!");
    };

    // Init sau khi đăng nhập
    const currentUser = localStorage.getItem('current_user');
    if (currentUser) {
        document.getElementById("authWrapper").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        document.getElementById("userNameDisplay").textContent = currentUser;
        enableDepositWithdrawButtons();
        loadUserInfo(currentUser);
        loadUserBetHistory(currentUser);
        loadUserHistory(currentUser);
    } else {
        disableDepositWithdrawButtons();
        document.getElementById("mainContent").style.display = "none";
        document.getElementById("authWrapper").style.display = "flex";
    }

    // Game board
    for(let i=1;i<=3;++i) renderDice3D(document.getElementById('dice3d-'+i), Math.floor(Math.random()*6)+1);
    updateBoard();
    startTimer();
});

// ==================== LỊCH SỬ NẠP/RÚT ====================
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

// ==================== THÔNG TIN USER ====================
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

// ==================== LỊCH SỬ CƯỢC ====================
async function loadUserBetHistory(username) {
    try {
        const res = await fetch(`/api/bet/history?username=${encodeURIComponent(username)}`);
        const bets = await res.json();
        let html = '';
        if(Array.isArray(bets) && bets.length) {
            bets.forEach(bet => {
                html += `<tr>
                    <td>${bet.timestamp || bet.time || ''}</td>
                    <td>${(bet.side || bet.bet_side)?.toUpperCase() || ''} (${Number(bet.amount).toLocaleString() || ''})</td>
                    <td>${bet.result === 'win' ? '<b style="color:var(--win-color)">Thắng</b>' : (bet.result === 'lose' ? '<b style="color:var(--lose-color)">Thua</b>' : 'Đang chờ')}</td>
                    <td>${bet.sum || ''} ${bet.dice1 ? `(${bet.dice1}-${bet.dice2}-${bet.dice3})` : ''}</td>
                    <td>${bet.result === 'win'
                        ? '<b style="color:var(--win-color)">Thắng</b>'
                        : bet.result === 'lose'
                        ? '<b style="color:var(--lose-color)">Thua</b>'
                        : 'Đang chờ'}</td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="5">Không có dữ liệu</td></tr>';
        }
        document.querySelector('#userStatsTable tbody').innerHTML = html;
    } catch (e) {
        document.querySelector('#userStatsTable tbody').innerHTML = '<tr><td colspan="5">Không tải được</td></tr>';
    }
}

// ==================== GAME BOARD ====================
function updateBoard() {
    if (document.getElementById("tx-round-id")) document.getElementById("tx-round-id").textContent = round;
    if (document.getElementById("tx-timer")) document.getElementById("tx-timer").textContent = timer;
    if (document.getElementById("tx-tai-total")) document.getElementById("tx-tai-total").textContent = totalTai.toLocaleString();
    if (document.getElementById("tx-xiu-total")) document.getElementById("tx-xiu-total").textContent = totalXiu.toLocaleString();
    if (document.getElementById("tx-bet-amount")) document.getElementById("tx-bet-amount").value = userBets[betSide] || 0;
    updateResultList();
    if (document.getElementById("tx-tai-select")) document.getElementById("tx-tai-select").classList.toggle("selected", betSide === "tai");
    if (document.getElementById("tx-xiu-select")) document.getElementById("tx-xiu-select").classList.toggle("selected", betSide === "xiu");
}

function updateResultList() {
    const el = document.getElementById("tx-result-list");
    if (!el) return;
    el.innerHTML = resultHistory.slice(0, 12).map(x =>
        `<span class="tx-result-ball ${x.result}">${x.sum}</span>`
    ).join("");
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
    let dice = [randDice(), randDice(), randDice()];
    let sum = dice[0]+dice[1]+dice[2];
    let result = sum >= 11 && sum <= 17 ? "tai" : "xiu";
    let username = localStorage.getItem('current_user');
    dialNum = sum;
    if (username && (userBets["tai"] > 0 || userBets["xiu"] > 0)) {
        const bet_side = userBets["tai"] > 0 ? "tai" : "xiu";
        const amount = userBets["tai"] > 0 ? userBets["tai"] : userBets["xiu"];
        fetch(API_BETS, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
                username, round, bet_side, amount,
                result: (bet_side === result ? "win" : "lose"),
                sum,
                dice1: dice[0], dice2: dice[1], dice3: dice[2],
                time: new Date().toLocaleString()
            })
        }).then(()=>loadUserBetHistory(username));
    }
    resultHistory.unshift({sum, result, dice});
    if(resultHistory.length>30) resultHistory.length=30;
    updateResultList();
    userBets = { tai: 0, xiu: 0 };
    totalTai = 0;
    totalXiu = 0;
    setTimeout(()=>{
        round++;
        dialNum = 12;
        startTimer();
        if(document.getElementById("tx-bet-btn")) document.getElementById("tx-bet-btn").disabled = false;
    }, 3200);
}

function randDice() {
    return Math.floor(Math.random()*6)+1;
}

// ==================== RESULT HISTORY PAGE ====================
function renderResultHistoryDiv(allResults) {
    let html = `<div class="result-history-title"><b>KẾT QUẢ</b></div>
    <div class="result-balls-row">`;
    allResults.forEach(r => {
        html += `<span class="result-ball ${r.result === 'tai' ? 'tai-ball' : 'xiu-ball'}" title="Phiên #${r.round || ''} - ${r.dice ? r.dice.join(',') : ''}">
            ${r.sum}
            ${r.dice ? `<div class="dice-mini">${r.dice.join('-')}</div>` : ''}
        </span>`;
    });
    html += `</div>
    <button class="result-copy-btn" id="resultCopyBtn">COPY</button>`;
    document.getElementById('resultHistoryPageContent').innerHTML = html;
    document.getElementById('resultCopyBtn').onclick = function() {
        let txt = allResults.map(x=>x.sum).join(" - ");
        navigator.clipboard.writeText(txt);
        this.textContent = "ĐÃ COPY!";
        setTimeout(()=>{this.textContent="COPY"}, 1200);
    };
}

// ============= 3D Dice functions ================
function renderDice3D(elem, value) {
    elem.innerHTML = `
    <div class="dice3d-3d" style="transform: ${dice3DRotation(value)};">
      ${[1,2,3,4,5,6].map(face => `<div class="face ${getFaceClass(face)}">${diceFaceDots(face)}</div>`).join('')}
    </div>
    `;
}
function dice3DRotation(value) {
    const faces = {
        1: 'rotateX(0deg) rotateY(0deg)',
        2: 'rotateX(-90deg) rotateY(0deg)',
        3: 'rotateX(0deg) rotateY(90deg)',
        4: 'rotateX(0deg) rotateY(-90deg)',
        5: 'rotateX(90deg) rotateY(0deg)',
        6: 'rotateX(180deg) rotateY(0deg)'
    };
    return faces[value] || 'rotateX(0deg) rotateY(0deg)';
}
function getFaceClass(n) {
    return ["front","back","right","left","top","bottom"][n-1];
}
function diceFaceDots(value) {
    const dot = '<span class="dice-dot"></span>';
    const faces = {
        1: `<div style="display:flex;justify-content:center;align-items:center;height:100%;"><span class="dice-dot"></span></div>`,
        2: `<div style="display:flex;flex-direction:column;justify-content:space-between;height:100%;">
                <span style="align-self:flex-start">${dot}</span>
                <span style="align-self:flex-end">${dot}</span>
            </div>`,
        3: `<div style="display:flex;flex-direction:column;justify-content:space-between;height:100%;">
                <span style="align-self:flex-start">${dot}</span>
                <span style="align-self:center">${dot}</span>
                <span style="align-self:flex-end">${dot}</span>
            </div>`,
        4: `<div style="display:flex;flex-wrap:wrap;width:100%;height:100%;align-items:center;">
                <span class="dice-dot"></span><span class="dice-dot" style="margin-left:auto"></span>
                <span class="dice-dot"></span><span class="dice-dot" style="margin-left:auto"></span>
            </div>`,
        5: `<div style="display:flex;flex-direction:column;justify-content:space-between;height:100%;">
                <div style="display:flex;justify-content:space-between;">
                  <span class="dice-dot"></span><span class="dice-dot"></span>
                </div>
                <div style="display:flex;justify-content:center;"><span class="dice-dot"></span></div>
                <div style="display:flex;justify-content:space-between;">
                  <span class="dice-dot"></span><span class="dice-dot"></span>
                </div>
            </div>`,
        6: `<div style="display:flex;flex-direction:column;justify-content:space-between;height:100%;">
                <div style="display:flex;justify-content:space-between;">
                  <span class="dice-dot"></span><span class="dice-dot"></span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span class="dice-dot"></span><span class="dice-dot"></span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span class="dice-dot"></span><span class="dice-dot"></span>
                </div>
            </div>`
    };
    return faces[value] || `<span>${value}</span>`;
}
