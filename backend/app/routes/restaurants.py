from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Restaurant, MenuItem, User
from sqlalchemy.exc import IntegrityError
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from sqlalchemy import func
from app.auth.auth import requires_auth
from app.utils.serializers import serialize_restaurant, serialize_menu_item

restaurants_bp = Blueprint('restaurants', __name__)

# GET /api/restaurants - Get all restaurants (or filter by location)
@restaurants_bp.route('/', methods=['GET'])
def get_restaurants():
    # Optional: Filter by customer's location to find deliverable restaurants
    customer_lat = request.args.get('lat', type=float)
    customer_lon = request.args.get('lon', type=float)

    query = Restaurant.query

    if customer_lat is not None and customer_lon is not None:
        customer_point = WKTElement(f'POINT({customer_lon} {customer_lat})', srid=4326)
        # Filter restaurants where the customer's point is within the restaurant's delivery_area
        query = query.filter(customer_point.ST_Within(Restaurant.delivery_area))

    restaurants = query.all()
    return jsonify([serialize_restaurant(r) for r in restaurants]), 200

# GET /api/restaurants/<id> - Get a single restaurant by ID
@restaurants_bp.route('/<int:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'message': 'Restaurant not found'}), 404
    return jsonify(serialize_restaurant(restaurant)), 200

# POST /api/restaurants - Create a new restaurant (Manager only)
@restaurants_bp.route('/', methods=['POST'])
@requires_auth(allowed_roles=['restaurant_manager'])
def create_restaurant(payload):
    user_id = payload['id']
    user_role = payload['role']

    if user_role != 'restaurant_manager':
        return jsonify({'message': 'Access denied: Only restaurant managers can create restaurants'}), 403

    data = request.get_json()
    name = data.get('name')
    address = data.get('address')
    location_data = data.get('location') # {'latitude': float, 'longitude': float}
    delivery_area_coords = data.get('delivery_area') # [{'latitude': float, 'longitude': float}, ...]

    if not all([name, address, location_data]):
        return jsonify({'message': 'Name, address, and location are required'}), 400

    # Convert location data to WKTElement
    if not isinstance(location_data, dict) or 'latitude' not in location_data or 'longitude' not in location_data:
        return jsonify({'message': 'Invalid location format. Expected {"latitude": float, "longitude": float}'}), 400
    
    lon = location_data['longitude']
    lat = location_data['latitude']
    location_wkt = WKTElement(f'POINT({lon} {lat})', srid=4326)

    delivery_area_wkt = None
    if delivery_area_coords:
        if not isinstance(delivery_area_coords, list) or not all(isinstance(c, dict) and 'latitude' in c and 'longitude' in c for c in delivery_area_coords):
            return jsonify({'message': 'Invalid delivery_area format. Expected [{"latitude": float, "longitude": float}, ...]'}), 400
        
        wkt_coords = []
        for coord in delivery_area_coords:
            wkt_coords.append(f"{coord['longitude']} {coord['latitude']}")
        # Ensure polygon is closed
        if wkt_coords and wkt_coords[0] == wkt_coords[-1]:
            wkt_coords.append(wkt_coords[0])
        
        polygon_wkt = f"POLYGON(({', '.join(wkt_coords)}))"
        delivery_area_wkt = WKTElement(polygon_wkt, srid=4326)

    try:
        new_restaurant = Restaurant(
            name=name,
            address=address,
            location=location_wkt,
            delivery_area=delivery_area_wkt,
            manager_id=user_id
        )
        db.session.add(new_restaurant)
        db.session.commit()
        return jsonify({'message': 'Restaurant created successfully', 'restaurant': serialize_restaurant(new_restaurant)}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Error creating restaurant. Check manager ID or unique constraints.'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

# --- Menu Item Endpoints ---

# GET /api/restaurants/<restaurant_id>/menu - Get menu items for a specific restaurant
@restaurants_bp.route('/<int:restaurant_id>/menu', methods=['GET'])
def get_restaurant_menu(restaurant_id):
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'message': 'Restaurant not found'}), 404
    
    menu_items = MenuItem.query.filter_by(restaurant_id=restaurant_id).all()
    return jsonify([serialize_menu_item(item) for item in menu_items]), 200

# POST /api/restaurants/<restaurant_id>/menu - Add a new menu item (Manager only)
@restaurants_bp.route('/<int:restaurant_id>/menu', methods=['POST'])
@requires_auth(allowed_roles=['restaurant_manager'])
def add_menu_item(payload, restaurant_id):
    user_id = payload['id']
    user_role = payload['role']

    if user_role != 'restaurant_manager':
        return jsonify({'message': 'Access denied: You are not the manager of this restaurant'}), 403

    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    price = data.get('price')
    is_available = data.get('is_available', True)

    if not all([name, price]):
        return jsonify({'message': 'Name and price are required for a menu item'}), 400

    try:
        new_item = MenuItem(
            restaurant_id=restaurant_id,
            name=name,
            description=description,
            price=price,
            is_available=is_available
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({'message': 'Menu item added successfully', 'menu_item': serialize_menu_item(new_item)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

# PUT /api/restaurants/<restaurant_id>/menu/<item_id> - Update a menu item (Manager only)
@restaurants_bp.route('/<int:restaurant_id>/menu/<int:item_id>', methods=['PUT'])
@requires_auth(allowed_roles=['restaurant_manager'])
def update_menu_item(payload, restaurant_id, item_id):
    user_id = payload['id']
    user_role = payload['role']

    if user_role != 'restaurant_manager':
        return jsonify({'message': 'Access denied: You are not the manager of this restaurant'}), 403

    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'message': 'Restaurant not found'}), 404
    if user_role != 'restaurant_manager' or restaurant.manager_id != user_id:
        return jsonify({'message': 'Access denied: You are not the manager of this restaurant'}), 403

    menu_item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant_id).first()
    if not menu_item:
        return jsonify({'message': 'Menu item not found in this restaurant'}), 404

    data = request.get_json()
    menu_item.name = data.get('name', menu_item.name)
    menu_item.description = data.get('description', menu_item.description)
    menu_item.price = data.get('price', menu_item.price)
    menu_item.is_available = data.get('is_available', menu_item.is_available)

    try:
        db.session.commit()
        return jsonify({'message': 'Menu item updated successfully', 'menu_item': serialize_menu_item(menu_item)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500

# DELETE /api/restaurants/<restaurant_id>/menu/<item_id> - Delete a menu item (Manager only)
@restaurants_bp.route('/<int:restaurant_id>/menu/<int:item_id>', methods=['DELETE'])
@requires_auth(allowed_roles=['restaurant_manager'])
def delete_menu_item(payload, restaurant_id, item_id):
    user_id = payload['id']
    user_role = payload['role']

    if user_role != 'restaurant_manager':
        return jsonify({'message': 'Access denied: You are not the manager of this restaurant'}), 403

    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'message': 'Restaurant not found'}), 404
    if user_role != 'restaurant_manager' or restaurant.manager_id != user_id:
        return jsonify({'message': 'Access denied: You are not the manager of this restaurant'}), 403

    menu_item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant_id).first()
    if not menu_item:
        return jsonify({'message': 'Menu item not found in this restaurant'}), 404

    try:
        db.session.delete(menu_item)
        db.session.commit()
        return jsonify({'message': 'Menu item deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'An error occurred: {str(e)}'}), 500