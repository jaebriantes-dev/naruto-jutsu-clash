import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO, emit
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'naruto_secret'
socketio = SocketIO(app, cors_allowed_origins="*")

players = {"player1": None, "player2": None}
current_round = 1
choices = {}

jutsus = [
    "rasengan","chidori","shadow_clone","fireball_jutsu","water_dragon",
    "thousand_years_of_death","rasenshuriken","gentle_fist","leaf_hurricane",
    "dragon_flame","water_wall","shadow_possession","reanimation_jutsu",
    "hundred_fists","flying_raijin","eight_trigrams"
]

kekkei_genkai = [
    "sharingan","mangekyo_sharingan","izanagi","byakugan","rinnegan",
    "tenseigan","wood_release","ice_release","lava_release","magnet_release"
]

affinity = {
    "rasengan": "wind", "chidori": "lightning", "shadow_clone": "ninjutsu",
    "fireball_jutsu": "fire", "water_dragon": "water", "thousand_years_of_death": "taijutsu",
    "rasenshuriken": "lightning", "gentle_fist": "taijutsu", "leaf_hurricane": "taijutsu",
    "dragon_flame": "fire", "water_wall": "water", "shadow_possession": "genjutsu",
    "reanimation_jutsu": "ninjutsu", "hundred_fists": "taijutsu", "flying_raijin": "wind",
    "eight_trigrams": "wind", "sharingan": "genjutsu", "mangekyo_sharingan": "genjutsu",
    "izanagi": "genjutsu", "byakugan": "taijutsu", "rinnegan": "ninjutsu",
    "tenseigan": "ninjutsu", "wood_release": "earth", "ice_release": "water",
    "lava_release": "earth", "magnet_release": "earth"
}

type_chart = {
    "fire": {"beats":"wind","loses":"water"},
    "water":{"beats":"fire","loses":"lightning"},
    "lightning":{"beats":"water","loses":"earth"},
    "earth":{"beats":"lightning","loses":"wind"},
    "wind":{"beats":"earth","loses":"fire"},
    "taijutsu":{"beats":"genjutsu","loses":"ninjutsu"},
    "genjutsu":{"beats":"ninjutsu","loses":"taijutsu"},
    "ninjutsu":{"beats":"taijutsu","loses":"genjutsu"}
}

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/game')
def game():
    return send_from_directory('.', 'game.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

def determine_winner(p1_choice, p2_choice):
    if p1_choice == p2_choice:
        return 0
    t1 = affinity[p1_choice]
    t2 = affinity[p2_choice]
    if type_chart[t1]["beats"]==t2:
        return 1
    elif type_chart[t1]["loses"]==t2:
        return 2
    else:
        return 0

@socketio.on('join_game')
def join_game(data):
    slot = data['player']
    players[slot] = request.sid
    if all(players.values()):
        global current_round
        current_round = 1
        emit('start_round', {'round': current_round}, broadcast=True)

@socketio.on('play')
def play(data):
    global current_round
    player = data['player']
    choice = data['choice']
    choices[player] = choice
    if len(choices)==2:
        # Determine winner
        p1_choice = choices['player1']
        p2_choice = choices['player2']
        result = determine_winner(p1_choice,p2_choice)
        if result==0:
            winner_name='Tie'
            loser_name='Tie'
            winner_choice=p1_choice
            loser_choice=p2_choice
        elif result==1:
            winner_name='Player 1'
            loser_name='Player 2'
            winner_choice=p1_choice
            loser_choice=p2_choice
        else:
            winner_name='Player 2'
            loser_name='Player 1'
            winner_choice=p2_choice
            loser_choice=p1_choice
        current_round+=1
        choices.clear()
        emit('round_result_display',{
            'winner_name':winner_name,
            'loser_name':loser_name,
            'winner_choice':winner_choice,
            'loser_choice':loser_choice,
            'round':current_round-1
        }, broadcast=True)

if __name__=="__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
