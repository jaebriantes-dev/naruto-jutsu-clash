// main.js - game front-end logic (2-player version)
const socket = io();
let playerSlot = null;
let currentRound = 1;
let waitingForOpponent = false;

const jutsus = [
    "rasengan","chidori","shadow_clone","fireball_jutsu","water_dragon",
    "thousand_years_of_death","rasenshuriken","gentle_fist","leaf_hurricane",
    "dragon_flame","water_wall","shadow_possession","reanimation_jutsu",
    "hundred_fists","flying_raijin","eight_trigrams"
];

const kekkei = [
    "sharingan","mangekyo_sharingan","izanagi","byakugan","rinnegan",
    "tenseigan","wood_release","ice_release","lava_release","magnet_release"
];

// --- Play background music on first click ---
document.addEventListener('click', () => {
    const mainMusic = document.getElementById('main_music');
    if (mainMusic && mainMusic.paused) mainMusic.play().catch(()=>{});
}, { once: true });

// --- Helper functions ---
function prettifyName(s) { return s.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()); }
function setResultText(txt) { const r=document.getElementById("result"); if(r) r.innerHTML=txt; }
function showMoveVisual(moveName, side='center', size=240) {
    const layer = document.getElementById('move-layer');
    if(!layer) return;
    const img = document.createElement('img');
    img.src = moveName+'.png';
    img.alt = moveName;
    img.className='move-img';
    img.style.width=size+'px';
    img.style.height='auto';
    img.style.opacity=0;
    img.style.transition='opacity 0.3s ease, transform 0.4s ease';
    if(side==='left') img.style.transform='translateX(-120px)';
    else if(side==='right') img.style.transform='translateX(120px)';
    else img.style.transform='translateX(0)';
    layer.appendChild(img);
    requestAnimationFrame(()=>{img.style.opacity=1; img.style.transform+=' translateY(-10px)';});
    setTimeout(()=>{img.style.opacity=0; setTimeout(()=>img.remove(),400);},2000);
    try{new Audio(moveName+'.mp3').play().catch(()=>{});}catch(e){}
}

// --- Show choices for the current round ---
function showChoices(round) {
    currentRound = round;
    const container=document.getElementById("choices");
    container.innerHTML="";
    let pool=(round<50)?jutsus:kekkei;
    pool.forEach(choice=>{
        const btn=document.createElement("button");
        btn.className="choice-btn";
        btn.innerHTML=prettifyName(choice);
        btn.onclick=()=>{
            if(waitingForOpponent) return;
            waitingForOpponent=true;
            setResultText("You selected: "+prettifyName(choice)+". Waiting for opponent...");
            document.querySelectorAll('.choice-btn').forEach(b=>b.disabled=true);
            socket.emit('play',{player:playerSlot,choice:choice});
            showMoveVisual(choice, playerSlot==='player1'?'left':'right',200);
        };
        container.appendChild(btn);
    });
}

// --- Socket.IO events ---
socket.on('connect',()=>console.log("✅ Connected to server"));

// Get player slot
socket.emit('get_player_slot');
socket.on('player_slot', data=>{
    playerSlot=data.slot;
    document.getElementById("players").innerText="You are "+prettifyName(data.slot)+". Waiting for other player...";
});

// Start round
socket.on('start_round', data=>{
    document.getElementById("round").innerText="Round "+data.round;
    showChoices(data.round);
});

// Display round results
socket.on('round_result_display', data=>{
    waitingForOpponent=false;
    document.querySelectorAll('.choice-btn').forEach(b=>b.disabled=false);
    setResultText(`Winner: ${data.winner_name} — ${prettifyName(data.winner_choice)}<br>
                   Loser: ${data.loser_name} — ${prettifyName(data.loser_choice)}`);
    showMoveVisual(data.winner_choice,'center',260);
    setTimeout(()=>showMoveVisual(data.loser_choice,'center',200),650);
    setTimeout(()=>showChoices(data.round+1),1500);
});
