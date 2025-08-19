from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import Order, OrderItem, MenuItem, Restaurant, Payment, Rating, User
from sqlalchemy.exc import IntegrityError
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from geoalchemy2.functions import ST_Contains
from sqlalchemy import func
from app.auth.auth import requires_auth
from app.utils.serializers import serialize_order, serialize_rating

orders_bp = Blueprint('orders', __name__)

# POST /api/orders - Create a new order
@orders_bp.route('/', methods=['POST'])
@requires_auth(allowed_roles=['customer', 'manager', 'admin', 'restaurant_manager', 'restaurant_admin'])
def create_order(payload):
    user_id = payload['id']
    
    data = request.get_json()
    restaurant_id = data.get('restaurant_id')
    items = data.get('items')
    delivery_address = data.get('delivery_address')
    delivery_location_data = data.get('delivery_location')
    payment_method = data.get('payment_method', 'cash_on_delivery')

    if not all([restaurant_id, items, delivery_address, delivery_location_data]):
        return jsonify({'message': 'بيانات الطلب غير مكتملة'}), 400

    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'message': 'المطعم غير موجود'}), 404

    if restaurant.delivery_area is not None:
        customer_point = WKTElement(f'POINT({delivery_location_data["longitude"]} {delivery_location_data["latitude"]})', srid=4326)
        if not db.session.query(func.ST_Within(customer_point, restaurant.delivery_area)).scalar():
            return jsonify({'message': 'Delivery location is outside the restaurant\'s delivery area'}), 400

    total_price = 0
    order_items_to_add = []
    for item_data in items:
        menu_item_id = item_data.get('menu_item_id')
        quantity = item_data.get('quantity')

        if not all([menu_item_id, quantity]) or quantity <= 0:
            return jsonify({'message': 'بيانات المنتج غير صالحة'}), 400

        menu_item = MenuItem.query.filter_by(id=menu_item_id, restaurant_id=restaurant_id, is_available=True).first()
        if not menu_item:
            return jsonify({'message': f'المنتج {menu_item_id} غير متوفر'}), 404

        total_price += menu_item.price * quantity
        
        order_items_to_add.append(OrderItem(
            menu_item_id=menu_item.id,
            quantity=quantity,
            price_at_order=menu_item.price,
            excluded_ingredients=item_data.get('excluded_ingredients'),
            notes=item_data.get('notes')
        ))
    
    delivery_location_wkt = WKTElement(f'POINT({delivery_location_data["longitude"]} {delivery_location_data["latitude"]})', srid=4326)

    try:
        new_order = Order(
            user_id=user_id,
            restaurant_id=restaurant_id,
            total_price=total_price,
            delivery_address=delivery_address,
            delivery_location=delivery_location_wkt,
            status='pending'
        )
        db.session.add(new_order)
        db.session.flush()

        for item in order_items_to_add:
            item.order_id = new_order.id
            db.session.add(item)
        
        new_payment = Payment(
            order_id=new_order.id,
            amount=total_price,
            payment_method=payment_method,
            status='pending'
        )
        db.session.add(new_payment)

        db.session.commit()
        return jsonify({'message': 'Order created successfully', 'order': serialize_order(new_order)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

# GET /api/orders - Get all orders for the current user
@orders_bp.route('/', methods=['GET'])
@requires_auth(allowed_roles=['customer', 'manager', 'admin', 'restaurant_manager', 'restaurant_admin'])
def get_user_orders(payload):
    """
    جلب الطلبات الشخصية للمستخدم الحالي فقط.
    هذه النقطة آمنة وتعرض فقط الطلبات التي يملكها المستخدم صاحب التوكن.
    """
    user_id = payload['id']

    # تم التعديل: المنطق الآن بسيط وآمن.
    # يتم جلب الطلبات فقط حيث user_id يطابق هوية المستخدم في التوكن.
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()

    return jsonify([serialize_order(o) for o in orders]), 200

@orders_bp.route('/<int:order_id>', methods=['GET'])
@requires_auth(allowed_roles=['customer', 'manager', 'admin', 'restaurant_manager', 'restaurant_admin'])
def get_order_details(payload, order_id):
    """
    جلب تفاصيل طلب شخصي واحد فقط للمستخدم الحالي.
    هذه النقطة آمنة وتتحقق من أن الطلب يخص المستخدم صاحب التوكن.
    """
    user_id = payload['id']

    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    
    if not order:
        return jsonify({'message': 'Order not found or you do not have permission to view it'}), 404

    return jsonify(serialize_order(order)), 200

# POST /api/orders/<id>/rate - Add a rating to an order (Customer only)
@orders_bp.route('/<int:order_id>/rate', methods=['POST'])
@requires_auth(allowed_roles=['customer', 'manager', 'admin', 'restaurant_manager', 'restaurant_admin'])
def rate_order(payload, order_id):
    user_id = payload['id']
    # التحقق الصارم من أن الطلب يخص المستخدم الحالي
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()

    if not order:
        return jsonify({'success': False, 'message': 'Order not found or you are not the owner'}), 404
    
    if order.status != 'delivered':
        return jsonify({'success': False, 'message': 'You can only rate delivered orders'}), 400
        
    if order.rating:
        return jsonify({'success': False, 'message': 'This order has already been rated'}), 400

    data = request.get_json()
    restaurant_rating = data.get('restaurant_rating')
    comment = data.get('comment')

    if not restaurant_rating or not (1 <= restaurant_rating <= 5):
        return jsonify({'success': False, 'message': 'Rating must be an integer between 1 and 5'}), 400

    try:
        new_rating = Rating(
            order_id=order_id,
            user_id=user_id,
            restaurant_rating=restaurant_rating,
            comment=comment
        )
        db.session.add(new_rating)
        db.session.commit()
        return jsonify({'message': 'Order rated successfully', 'rating': serialize_rating(new_rating)}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'This order has already been rated'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500