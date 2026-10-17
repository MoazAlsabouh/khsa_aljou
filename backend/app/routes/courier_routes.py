from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Order, Courier, User
from app.auth.auth import requires_auth
from app.utils.serializers import serialize_order
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape

courier_bp = Blueprint('courier_bp', __name__)


def get_or_create_courier(user_id: int) -> Courier:
    """جلب ملف المندوب أو إنشاؤه تلقائياً عند أول دخول لبوابة المندوب."""
    courier = Courier.query.filter_by(user_id=user_id).first()
    if not courier:
        courier = Courier(
            user_id=user_id,
            vehicle_type='دراجة نارية',
            vehicle_plate='دمشق - ---',
            status='available'
        )
        db.session.add(courier)
        db.session.commit()
    return courier


@courier_bp.route('/profile', methods=['GET', 'POST'])
@requires_auth(allowed_roles=['courier', 'admin', 'manager'])
def manage_profile(payload):
    user_id = payload['id']
    courier = get_or_create_courier(user_id)

    if request.method == 'GET':
        loc = None
        if courier.current_location:
            pt = to_shape(courier.current_location)
            loc = {'latitude': pt.y, 'longitude': pt.x}
        return jsonify({
            'id': courier.id,
            'status': courier.status,
            'vehicle_type': courier.vehicle_type,
            'vehicle_plate': courier.vehicle_plate,
            'current_location': loc
        }), 200

    if request.method == 'POST':
        data = request.get_json() or {}
        courier.vehicle_type = data.get('vehicle_type', courier.vehicle_type)
        courier.vehicle_plate = data.get('vehicle_plate', courier.vehicle_plate)
        courier.status = data.get('status', courier.status)
        db.session.commit()
        return jsonify({
            'message': 'تم تحديث بيانات المندوب بنجاح',
            'status': courier.status,
            'vehicle_type': courier.vehicle_type,
            'vehicle_plate': courier.vehicle_plate
        }), 200


@courier_bp.route('/location', methods=['PUT'])
@requires_auth(allowed_roles=['courier', 'admin', 'manager'])
def update_location(payload):
    user_id = payload['id']
    data = request.get_json() or {}
    lat = data.get('lat')
    lon = data.get('lon')

    if lat is None or lon is None:
        return jsonify({'message': 'يجب توفير الإحداثيات (lat, lon)'}), 400

    courier = get_or_create_courier(user_id)

    # تحديث الموقع الجغرافي في PostGIS
    courier.current_location = WKTElement(f'POINT({lon} {lat})', srid=4326)
    db.session.commit()

    # بث الموقع لحظياً عبر WebSockets لجميع الطلبات النشطة المسندة لهذا المندوب
    from app.websocket import socketio
    active_orders = Order.query.filter(
        Order.courier_id == courier.id,
        Order.status.in_(['picked_up', 'on_the_way'])
    ).all()

    for active_order in active_orders:
        socketio.emit('courier_location_update', {
            'order_id': active_order.id,
            'lat': float(lat),
            'lon': float(lon)
        }, room=f"order_{active_order.id}")

    return jsonify({'message': 'تم تحديث الموقع وبثه بنجاح'}), 200


@courier_bp.route('/orders/available', methods=['GET'])
@requires_auth(allowed_roles=['courier', 'admin', 'manager'])
def get_available_orders(payload):
    """جلب الطلبات الجاهزة أو قيد التحضير التي لم تُسند لمندوب بعد."""
    orders = Order.query.filter(
        Order.status.in_(['ready_for_pickup', 'preparing', 'accepted']),
        Order.courier_id.is_(None)
    ).order_by(Order.created_at.desc()).all()

    return jsonify([serialize_order(o) for o in orders]), 200


@courier_bp.route('/orders/my-active', methods=['GET'])
@requires_auth(allowed_roles=['courier', 'admin', 'manager'])
def get_my_active_orders(payload):
    """جلب الطلبات المسندة حالياً للمندوب."""
    user_id = payload['id']
    courier = get_or_create_courier(user_id)

    orders = Order.query.filter(
        Order.courier_id == courier.id,
        Order.status.in_(['picked_up', 'on_the_way'])
    ).order_by(Order.created_at.desc()).all()

    return jsonify([serialize_order(o) for o in orders]), 200


@courier_bp.route('/orders/<int:order_id>/accept', methods=['PUT'])
@requires_auth(allowed_roles=['courier', 'admin', 'manager'])
def accept_order(payload, order_id):
    user_id = payload['id']
    courier = get_or_create_courier(user_id)

    order = Order.query.get_or_404(order_id)
    if order.courier_id and order.courier_id != courier.id:
        return jsonify({'message': 'عذراً، تم التقاط هذا الطلب من مندوب آخر'}), 400

    order.courier_id = courier.id
    order.status = 'picked_up'
    courier.status = 'busy'
    db.session.commit()

    # إشعار العميل عبر WebSockets بأن المندوب استلم الطلب
    from app.websocket import socketio
    socketio.emit('order_status_update', {
        'order_id': order.id,
        'status': order.status
    }, room=f"order_{order.id}")

    return jsonify({
        'message': 'تم استلام الطلب بنجاح! يمكنك الآن بدء التوصيل.',
        'order': serialize_order(order)
    }), 200


@courier_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@requires_auth(allowed_roles=['courier', 'admin', 'manager'])
def update_order_status(payload, order_id):
    user_id = payload['id']
    courier = get_or_create_courier(user_id)

    data = request.get_json() or {}
    new_status = data.get('status')

    if new_status not in ['picked_up', 'on_the_way', 'delivered']:
        return jsonify({'message': 'حالة غير صالحة'}), 400

    order = Order.query.get_or_404(order_id)
    if order.courier_id != courier.id:
        return jsonify({'message': 'غير مصرح لك بتحديث هذا الطلب'}), 403

    order.status = new_status
    if new_status == 'delivered':
        # التحقق مما إذا كان لدى المندوب طلبات أخرى نشطة
        other_active = Order.query.filter(
            Order.courier_id == courier.id,
            Order.id != order.id,
            Order.status.in_(['picked_up', 'on_the_way'])
        ).count()
        if other_active == 0:
            courier.status = 'available'

    db.session.commit()

    # إعلام العميل بتغير الحالة عبر WebSockets
    from app.websocket import socketio
    socketio.emit('order_status_update', {
        'order_id': order.id,
        'status': new_status
    }, room=f"order_{order.id}")

    return jsonify({
        'message': f'تم تحديث حالة الطلب بنجاح',
        'order': serialize_order(order)
    }), 200
