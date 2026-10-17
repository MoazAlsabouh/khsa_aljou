from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins="*")

def init_socketio(app):
    socketio.init_app(app)

@socketio.on('connect')
def handle_connect():
    print("Client connected")

@socketio.on('join_restaurant_room')
def handle_join_restaurant_room(data):
    from flask_socketio import join_room
    restaurant_id = data.get('restaurant_id')
    if restaurant_id:
        room = f"restaurant_{restaurant_id}"
        join_room(room)
        print(f"Client joined room: {room}")

@socketio.on('join_order_room')
def handle_join_order_room(data):
    from flask_socketio import join_room
    order_id = data.get('order_id')
    if order_id:
        room = f"order_{order_id}"
        join_room(room)
        print(f"Client joined order room: {room}")
