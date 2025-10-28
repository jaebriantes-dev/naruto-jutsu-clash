import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template_string, send_from_directory, abort
from flask_socketio import SocketIO, emit
import os

app = Flask(__name__)
app.config['SECRET_KEY']='naruto_secret'
socketio = SocketIO(app, cors_allowed_origins="*")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
rooms = {}

jutsus = ["rasengan","chidori","shadow_clone","fireball_jutsu","water_dragon","thousand_years_of_death","rasenshuriken","gentle_fist","leaf_hurricane","dragon_flame","water_wall","shadow_possession","reanimation_jutsu","hundred_fists","flying_raijin","eight_trigrams"]
kekkei_genkai = ["sharingan","mangekyo_sharingan","izanagi","byakugan","rinnegan","tenseigan","wood_release","ice_release","lava_release","magnet_release"]

# --- Serve static files ---
@app.route('/<path:filename>')
def serve_file(filename):
    path = os.path.join(BASE_DIR, filename)
    if os.path.exists(path):
        return send_from_directory(BASE_DIR, filename)
    abort(404)

# --- Game page ---
@app.route('/game/<room_code>')
def game(room_code):
    if room_code not in rooms:
        return "Room not found",404
    with open("game.html","r",encoding="utf-8") as f:
        return render_template_string(f.read(), room_code=room_code, jutsus=jutsus, kekkei_genkai=kekkei_genkai)

# --- SocketIO ---
@socketio.on('join_game')
def join_game(data):
    playerNumber = data.get('playerNumber')
    room_code = data.get('room_code')
    if room_code not in rooms:
        rooms[room_code] = {'players':{}}
    rooms[room_code]['players'][playerNumber] = True
    if len(rooms[room_code]['players'])==2:
        emit('show_start_button', room=room_code, broadcast=True)

@socketio.on('start_game_manual')
def start_game_manual(data):
    room_code = data.get('room_code')
    emit('round_result_display', {'winner_choice':'rasengan','loser_choice':'chidori'}, room=room_code)

@socketio.on('play')
def play(data):
    room_code = data['room_code']
    choice = data['choice']
    playerNumber = data['playerNumber']
    if 'choices' not in rooms[room_code]:
        rooms[room_code]['choices'] = {}
    rooms[room_code]['choices'][playerNumber] = choice
    if len(rooms[room_code]['choices'])==2:
        choices = rooms[room_code]['choices']
        # simple winner random for now
        winner_choice = choices['1']
        loser_choice = choices['2']
        emit('round_result_display', {'winner_choice':winner_choice,'loser_choice':loser_choice}, room=room_code)
        rooms[room_code]['choices'] = {}

if __name__=="__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
