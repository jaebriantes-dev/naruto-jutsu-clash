// --- main.js ---
const socket = io();
let playerNumber = null;
let currentRound = 1;
let waitingForOpponent = false;

// Unlock music
document.addEventListener('click', () => {
    const audio = document.getElementById('main_music');
    if (audio && audio.paused) audio.play().catch(() => {});
}, { once: true });

// Ask for player number
if (!playerNumber) {
    playerNumber = prompt("Enter your player number (1 or 2):");
    if (!["1","2"].includes(playerNumber)) playerNumber = "1";
}

// Join room automatically
if (typeof roomCode !== "undefined" && roomCode) {
    socket.emit("join_game", { playerNumber, room_code: roomCode });
}

// --- Show move choices ---
function showChoices(round) {
    currentRound = round;
    const container = document.getElementById("choices");
    container.innerHTML = "";
    let pool = (round < 50) ? jutsus : kekkei;

    pool.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerHTML = choice.replace(/_/g,' ');
        btn.onclick = () => {
            if (waitingForOpponent) return;
            waitingForOpponent = true;
            setResultText("You selected: " + choice + ". Waiting for opponent...");
            document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
            socket.emit('play', { room_code: roomCode, choice: choice, playerNumber });
            showMoveVisual(choice, playerNumber==='1'?'left':'right',200);
        };
        container.appendChild(btn);
    });
}

function setResultText(txt){
    const r = document.getElementById("result");
    if(r) r.innerHTML = txt;
}

function showMoveVisual(moveName, side='center', size=240){
    const layer = document.getElementById('move-layer');
    if(!layer) return;
    const img = document.createElement('img');
    img.src = moveName+'.png';
    img.alt = moveName;
    img.style.width = size+'px';
    img.style.height = 'auto';
    img.style.opacity = 0;
    img.style.transition = 'opacity 0.3s ease, transform 0.4s ease';
    if(side==='left') img.style.transform = 'translateX(-120px)';
    else if(side==='right') img.style.transform = 'translateX(120px)';
    layer.appendChild(img);
    requestAnimationFrame(()=>{ img.style.opacity=1; img.style.transform+=' translateY(-10px)'; });
    setTimeout(()=>{ img.style.opacity=0; setTimeout(()=>img.remove(),400); },2000);
    try { new Audio(moveName+'.mp3').play().catch(()=>{}); } catch(e){}
}

// --- Start Game Button ---
function startGame(){
    document.getElementById('startGameBtn').style.display='none';
    setResultText("Game started!");
    socket.emit('start_game_manual', { room_code: roomCode });
}

// --- Socket events ---
socket.on('show_start_button', () => {
    document.getElementById('startGameBtn').style.display='block';
    setResultText("Both players joined. Click START GAME.");
});

socket.on('round_result_display', data => {
    waitingForOpponent=false;
    setResultText(`Winner: ${data.winner_choice} | Loser: ${data.loser_choice}`);
    showMoveVisual(data.winner_choice,'center',260);
    setTimeout(()=>showMoveVisual(data.loser_choice,'center',200),650);
    setTimeout(()=>showChoices(currentRound+1),1500);
});
