from flask import Flask, render_template_string, send_from_directory
from flask_socketio import SocketIO, join_room, emit
import random
import string
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'naruto_secret'
socketio = SocketIO(app, cors_allowed_origins="*")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
rooms = {}

# --- Jutsu and Kekkei Genkai ---
jutsus = [
    "rasengan", "chidori", "shadow_clone", "fireball_jutsu", "water_dragon",
    "thousand_years_of_death", "rasenshuriken", "gentle_fist", "leaf_hurricane",
    "dragon_flame", "water_wall", "shadow_possession", "reanimation_jutsu",
    "hundred_fists", "flying_raijin", "eight_trigrams"
]

kekkei_genkai = [
    "sharingan", "mangekyo_sharingan", "izanagi", "byakugan", "rinnegan",
    "tenseigan", "wood_release", "ice_release", "lava_release", "magnet_release"
]

# --- Type advantages ---
type_chart = {
    "fire": {"beats": "wind", "loses": "water"},
    "water": {"beats": "fire", "loses": "lightning"},
    "lightning": {"beats": "water", "loses": "earth"},
    "earth": {"beats": "lightning", "loses": "wind"},
    "wind": {"beats": "earth", "loses": "fire"},
    "taijutsu": {"beats": "genjutsu", "loses": "ninjutsu"},
    "genjutsu": {"beats": "ninjutsu", "loses": "taijutsu"},
    "ninjutsu": {"beats": "taijutsu", "loses": "genjutsu"}
}

# --- Assign types to each jutsu ---
affinity = {
    "rasengan": "wind",
    "chidori": "lightning",
    "shadow_clone": "ninjutsu",
    "fireball_jutsu": "fire",
    "water_dragon": "water",
    "thousand_years_of_death": "taijutsu",
    "rasenshuriken": "lightning",
    "gentle_fist": "taijutsu",
    "leaf_hurricane": "taijutsu",
    "dragon_flame": "fire",
    "water_wall": "water",
    "shadow_possession": "genjutsu",
    "reanimation_jutsu": "ninjutsu",
    "hundred_fists": "taijutsu",
    "flying_raijin": "wind",
    "eight_trigrams": "wind",
    "sharingan": "genjutsu",
    "mangekyo_sharingan": "genjutsu",
    "izanagi": "genjutsu",
    "byakugan": "taijutsu",
    "rinnegan": "ninjutsu",
    "tenseigan": "ninjutsu",
    "wood_release": "earth",
    "ice_release": "water",
    "lava_release": "earth",
    "magnet_release": "earth"
}

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def determine_winner(p1_choice, p2_choice):
    if p1_choice == p2_choice:
        return 0  # tie
    t1 = affinity[p1_choice]
    t2 = affinity[p2_choice]

    if type_chart[t1]["beats"] == t2:
        return 1
    elif type_chart[t1]["loses"] == t2:
        return 2
    else:
        return 0  # no advantage, tie

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory(BASE_DIR, filename)

@app.route('/')
def index():
    with open("index.html", "r", encoding="utf-8") as f:
        return render_template_string(f.read())

@app.route('/game/<room_code>')
def game(room_code):
    if room_code not in rooms:
        return "Room not found!", 404
    with open("game.html", "r", encoding="utf-8") as f:
        return render_template_string(f.read(), room_code=room_code, jutsus=jutsus, kekkei_genkai=kekkei_genkai)

@socketio.on('create_room')
def create_room(data):
    nickname = data['nickname']
    room_code = generate_room_code()
    rooms[room_code] = {'players': {nickname: {'wins': 0}}, 'choices': [], 'round': 1}
    join_room(room_code)
    emit('room_created', {'room_code': room_code})

@socketio.on('join_room')
def join_room_event(data):
    nickname = data['nickname']
    room_code = data['room_code']
    if room_code in rooms and len(rooms[room_code]['players']) < 2:
        rooms[room_code]['players'][nickname] = {'wins': 0}
        join_room(room_code)
        emit('room_joined', {'room_code': room_code, 'players': list(rooms[room_code]['players'].keys())}, room=room_code)
    else:
        emit('error', 'Room full or does not exist.')

@socketio.on('play')
def play(data):
    room_code = data['room_code']
    choice = data['choice']
    nickname = data['nickname']
    room = rooms[room_code]
    room['choices'].append({'nickname': nickname, 'choice': choice})

    if len(room['choices']) < 2:
        emit('status', 'Waiting for other player...', room=room_code)
        return

    p1, p2 = room['choices']
    result = determine_winner(p1['choice'], p2['choice'])

    if result == 0:
        room['choices'] = []
        emit('tie', 'Tie! Both selected same or neutral.', room=room_code)
        return

    winner = p1 if result == 1 else p2
    loser = p2 if result == 1 else p1

    room['players'][winner['nickname']]['wins'] += 1
    room['round'] += 1
    room['choices'] = []

    # Sharingan evolution check
    if winner['choice'] == "sharingan" and room['players'][winner['nickname']]['wins'] >= 5:
        winner['choice'] = "mangekyo_sharingan"

    emit('round_result_display', {
        'winner_name': winner['nickname'],
        'loser_name': loser['nickname'],
        'winner_choice': winner['choice'],
        'loser_choice': loser['choice'],
        'round': room['round'] - 1
    }, room=room_code)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
