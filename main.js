// main.js - game front-end logic
const socket = io();
let room = "";
let nickname = localStorage.getItem("nickname") || "";
let currentRound = 1;
let waitingForOpponent = false;

// --- Autoplay unlock (music on first click) ---
document.addEventListener('click', () => {
    const mainMusic = document.getElementById('main_music');
    if (mainMusic && mainMusic.paused) mainMusic.play().catch(() => {});
}, { once: true });

// Ask nickname if not saved
if (!nickname) {
    nickname = prompt("Enter your ninja name:") || "Player";
    localStorage.setItem("nickname", nickname);
}

// Automatically join the room if game.html loaded
if (typeof roomCode !== "undefined" && roomCode) {
    socket.emit("join_room", { nickname: nickname, room_code: roomCode });
    room = roomCode;
}

// --- Create Room (index page only) ---
function createRoom() {
    nickname = document.getElementById("nickname").value || "Player";
    localStorage.setItem("nickname", nickname);
    socket.emit("create_room", { nickname });
}

// --- Join Room (index page only) ---
function joinRoom() {
    nickname = document.getElementById("nickname").value || "Player";
    room = document.getElementById("room_code").value;
    if (!room) return alert("Enter a room code first!");
    localStorage.setItem("nickname", nickname);
    socket.emit("join_room", { nickname, room_code: room });
}

// --- Helpers ---
function prettifyName(s) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
function setResultText(txt) {
    const r = document.getElementById("result");
    if (r) r.innerHTML = txt;
}

// --- Show move animation + sound ---
function showMoveVisual(moveName, side = 'center', size = 240) {
    const layer = document.getElementById('move-layer');
    if (!layer) return;
    const img = document.createElement('img');
    img.src = moveName + '.png';
    img.alt = moveName;
    img.className = 'move-img';
    img.style.width = size + 'px';
    img.style.height = 'auto';
    img.style.opacity = 0;
    img.style.transition = 'opacity 0.3s ease, transform 0.4s ease';

    // Position side
    if (side === 'left') img.style.transform = 'translateX(-120px)';
    else if (side === 'right') img.style.transform = 'translateX(120px)';
    else img.style.transform = 'translateX(0)';

    layer.appendChild(img);
    requestAnimationFrame(() => {
        img.style.opacity = 1;
        img.style.transform += ' translateY(-10px)';
    });

    setTimeout(() => {
        img.style.opacity = 0;
        setTimeout(() => img.remove(), 400);
    }, 2000);

    // Sound
    try {
        const sfx = new Audio(moveName + '.mp3');
        sfx.volume = 0.9;
        sfx.play().catch(()=>{});
    } catch(e) {}
}

// --- Winner/loser icons ---
function showResultIcons(winnerName, loserName) {
    const res = document.getElementById('result-layer');
    res.innerHTML = `
      <div class="result-winner"><img src="winner.png" alt="winner" class="status-icon"></div>
      <div class="result-loser"><img src="defeated.png" alt="defeated" class="status-icon"></div>
    `;
    setTimeout(()=> res.innerHTML = '', 2000);
}

// --- Display available moves ---
function showChoices(round) {
    currentRound = round;
    const container = document.getElementById("choices");
    container.innerHTML = "";
    let pool = (round < 50) ? jutsus : kekkei;

    pool.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerHTML = prettifyName(choice);
        btn.onclick = () => {
            if (waitingForOpponent) return;
            waitingForOpponent = true;
            setResultText("You selected: " + prettifyName(choice) + ". Waiting for opponent...");
            document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
            socket.emit('play', { room_code: room, choice: choice, nickname: nickname });
            showMoveVisual(choice, 'left', 200);
        };
        container.appendChild(btn);
    });
}

// === SOCKET EVENT HANDLERS ===

// Room created
socket.on('room_created', data => {
    room = data.room_code;
    document.getElementById("players").innerText = `Room: ${room} — Waiting for opponent...`;
});

// Room joined
socket.on('room_joined', data => {
    room = data.room_code;
    const p = document.getElementById("players");
    p.innerText = `Players: ${data.players.join(' vs ')}`;
    if (data.players.length === 2) showChoices(1);
});

// Waiting status
socket.on('status', msg => setResultText(msg));

// Tie
socket.on('tie', msg => {
    waitingForOpponent = false;
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
    setResultText(msg);
});

// Round result broadcast
socket.on('round_result_display', data => {
    document.getElementById("round").innerText = `Round ${data.round}`;
    waitingForOpponent = false;
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);

    setResultText(`Winner: ${data.winner_name} — ${prettifyName(data.winner_choice)}<br>
                   Loser: ${data.loser_name} — ${prettifyName(data.loser_choice)}`);

    // Visuals
    showMoveVisual(data.winner_choice, 'center', 260);
    setTimeout(()=> showMoveVisual(data.loser_choice, 'center', 200), 650);

    // Audio feedback
    if (nickname === data.winner_name) new Audio("winner.mp3").play().catch(()=>{});
    else if (nickname === data.loser_name) new Audio("defeated.mp3").play().catch(()=>{});
    else new Audio("tie.mp3").play().catch(()=>{});

    // Icons
    showResultIcons(data.winner_name, data.loser_name);

    // Next round
    setTimeout(()=> showChoices(data.round + 1), 1500);
});

// Error event
socket.on('error', msg => setResultText("Error: " + msg));
