// main.js - game front-end logic
const socket = io();
let room = "";
let nickname = "";
let currentRound = 1;
let waitingForOpponent = false;

// start background music only after user interaction (autoplay restrictions)
document.addEventListener('click', () => {
    const mainMusic = document.getElementById('main_music');
    if (mainMusic && mainMusic.paused) {
        mainMusic.play().catch(()=>{});
    }
}, { once: true });

// Create Room (from index page)
function createRoom() {
    nickname = document.getElementById("nickname").value || "Player";
    socket.emit('create_room', {nickname: nickname});
    // redirect to game page will be handled by server response or user manually open link
}

// Join Room (from index page)
function joinRoom() {
    nickname = document.getElementById("nickname").value || "Player";
    room = document.getElementById("room_code").value;
    socket.emit('join_room', {nickname: nickname, room_code: room});
}

// Show choices (jutsu or kekkei depending on round)
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
            // disable all buttons while waiting
            document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
            socket.emit('play', {room_code: room, choice: choice, nickname: nickname});
        };
        container.appendChild(btn);
    });
}

// helper: prettify a snake_case name to human-friendly
function prettifyName(s) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// small helper to set text in result area
function setResultText(txt) {
    const r = document.getElementById("result");
    r.innerHTML = txt;
}

// show battlefield visuals for a move (image+play sound)
function showMoveVisual(moveName, side = 'center', size = 240) {
    const layer = document.getElementById('move-layer');
    const img = document.createElement('img');
    img.src = moveName + '.png';
    img.alt = moveName;
    img.className = 'move-img';
    img.style.width = size + 'px';
    img.style.height = 'auto';

    // position: left / right / center
    if (side === 'left') img.style.transform = 'translateX(-100px)';
    else if (side === 'right') img.style.transform = 'translateX(100px)';
    else img.style.transform = 'translateX(0)';

    // fade-in animation
    img.style.opacity = 0;
    layer.appendChild(img);
    requestAnimationFrame(() => {
        img.style.transition = 'opacity 300ms ease, transform 400ms ease';
        img.style.opacity = 1;
        img.style.transform += ' translateY(-10px)';
    });

    // remove after 2.5s
    setTimeout(() => {
        img.style.transition = 'opacity 400ms ease';
        img.style.opacity = 0;
        setTimeout(() => layer.removeChild(img), 450);
    }, 2000);

    // try to play move sound
    try {
        const s = new Audio(moveName + '.mp3');
        s.volume = 0.9;
        s.play().catch(()=>{});
    } catch(e) { /* ignore */ }
}

// show winner/defeated icons
function showResultIcons(winnerName, loserName) {
    const res = document.getElementById('result-layer');
    res.innerHTML = `
      <div class="result-winner"><img src="winner.png" alt="winner" class="status-icon"></div>
      <div class="result-loser"><img src="defeated.png" alt="defeated" class="status-icon"></div>
    `;
    setTimeout(()=> res.innerHTML = '', 2000);
}

// SOCKET EVENT HANDLERS

// room created (client that created)
// server sends { room_code }
socket.on('room_created', data => {
    room = data.room_code;
    document.getElementById("players").innerText = `Room: ${room} — Waiting for opponent...`;
});

// room joined (both clients receive in room)
socket.on('room_joined', data => {
    room = data.room_code;
    document.getElementById("players").innerText = `Players: ${data.players.join(' vs ')}`;
    showChoices(1);
});

// generic status (waiting ...)
socket.on('status', msg => {
    setResultText(msg);
});

// tie handling (both players)
socket.on('tie', msg => {
    waitingForOpponent = false;
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
    setResultText(msg);
});

// personal round_result - sent to each player separately with their role
// data: { your_role, your_choice, opponent_choice, opponent_name, round }
socket.on('round_result', data => {
    // update round number
    document.getElementById("round").innerText = `Round ${data.round}`;
    waitingForOpponent = false;
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);

    // play personal winner/defeated effect
    const personalAudio = document.getElementById('personal_effect');
    personalAudio.src = (data.your_role === 'winner') ? 'winner.mp3' : 'defeated.mp3';
    personalAudio.play().catch(()=>{});

    // show personal info & play your choice sound & image on center-left to show "you"
    setResultText(`You are the ${data.your_role.toUpperCase()}! Opponent: ${data.opponent_name}`);
    // show your move image (left)
    showMoveVisual(data.your_choice, 'left', 200);
    // show opponent move image (right)
    // opponent image will be shown when the broadcast arrives; we also create a quick small play
    setTimeout(()=> showMoveVisual(data.opponent_choice, 'right', 180), 200);

    // play your ability sound (also played above in showMoveVisual, but we play again to ensure)
    try {
        const abilityAudio = new Audio(data.your_choice + '.mp3');
        abilityAudio.play().catch(()=>{});
    } catch(e){}
});

// broadcast display for everyone: show winner/loser and central visuals
socket.on('round_result_display', data => {
    // Update round in UI
    document.getElementById("round").innerText = `Round ${data.round}`;
    // show both moves on center stage and highlight winner
    // show winner move (center)
    showMoveVisual(data.winner_choice, 'center', 260);
    // after short delay show loser slightly faded
    setTimeout(()=> {
        showMoveVisual(data.loser_choice, 'center', 200);
    }, 650);

    // show icons and short text
    setTimeout(()=> {
        setResultText(`Winner: ${data.winner_name} — ${prettifyName(data.winner_choice)} <br> Loser: ${data.loser_name} — ${prettifyName(data.loser_choice)}`);
        showResultIcons(data.winner_name, data.loser_name);
    }, 900);
    
    // prepare next choices pool depending on round
    setTimeout(()=> showChoices(data.round + 1), 1200);
});

// error events
socket.on('error', msg => {
    setResultText("Error: " + msg);
});
