from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import User, Restaurant, RestaurantApplication, MenuItem, MenuItemImage
from app.auth.auth import requires_auth
from app.utils.serializers import serialize_user, serialize_restaurant_application, serialize_restaurant
from app.utils.cloudinary_utils import delete_image, extract_public_id_from_url
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, or_
import json
import os

admin_bp = Blueprint('admin_bp', __name__)

# --- إدارة المستخدمين ---

@admin_bp.route('/users', methods=['GET'])
@requires_auth(allowed_roles=['manager', 'admin'])
def get_all_users(payload):
    """جلب قائمة بجميع المستخدمين مع ترقيم الصفحات."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    pagination = User.query.order_by(User.id.asc()).paginate(page=page, per_page=per_page, error_out=False)
    users = pagination.items
    
    return jsonify({
        'users': [serialize_user(u) for u in users],
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'total_users': pagination.total
    }), 200

@admin_bp.route('/users/search', methods=['GET'])
@requires_auth(allowed_roles=['manager', 'admin', 'restaurant_manager'])
def search_users(payload):
    """البحث عن مستخدمين بالبريد الإلكتروني أو رقم الهاتف."""
    query_param = request.args.get('q')
    if not query_param:
        return jsonify({"success": False, "message": "Search query parameter 'q' is required."}), 400

    search_term = f"%{query_param}%"
    
    users = User.query.filter(
        or_(
            User.email.ilike(search_term),
            User.phone_number.ilike(search_term)
        )
    ).all()

    return jsonify([serialize_user(u) for u in users]), 200

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@requires_auth(allowed_roles=['manager', 'admin'])
def change_user_role(payload, user_id):
    """تغيير دور مستخدم معين."""
    acting_user_role = payload['role']
    data = request.get_json()
    new_role = data.get('new_role')

    if not new_role:
        return jsonify({"success": False, "message": "New role is required"}), 400

    user_to_change = User.query.get(user_id)
    if not user_to_change:
        return jsonify({"success": False, "message": "User not found"}), 404

    # قواعد تغيير الأدوار
    if acting_user_role == 'manager':
        if new_role in ['admin', 'manager'] or user_to_change.role in ['admin', 'manager']:
            return jsonify({"success": False, "message": "Managers cannot assign or modify admin/manager roles"}), 403
    
    user_to_change.role = new_role
    db.session.commit()
    return jsonify({"success": True, "message": f"User {user_id} role changed to {new_role}"}), 200

@admin_bp.route('/users/<int:user_id>/ban', methods=['POST'])
@requires_auth(allowed_roles=['manager', 'admin'])
def ban_user(payload, user_id):
    """حظر مستخدم."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    user.is_banned = True
    db.session.commit()
    return jsonify({"success": True, "message": f"User {user_id} has been banned"}), 200

@admin_bp.route('/users/<int:user_id>/unban', methods=['POST'])
@requires_auth(allowed_roles=['manager', 'admin'])
def unban_user(payload, user_id):
    """إلغاء حظر مستخدم."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    user.is_banned = False
    db.session.commit()
    return jsonify({"success": True, "message": f"User {user_id} has been unbanned"}), 200

# --- إدارة المطاعم ---

@admin_bp.route('/restaurants', methods=['GET'])
@requires_auth(allowed_roles=['manager', 'admin'])
def get_all_restaurants(payload):
    """جلب قائمة بجميع المطاعم مع ترقيم الصفحات والفلترة."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # الفلترة
    query = Restaurant.query
    name = request.args.get('name')
    address_filter = request.args.get('address') # للبحث عن مدينة أو منطقة
    status = request.args.get('status') # فلتر الحالة

    if name:
        query = query.filter(Restaurant.name.ilike(f"%{name}%"))
    if address_filter:
        query = query.filter(Restaurant.address.ilike(f"%{address_filter}%"))
    if status and status in ['active', 'suspended']:
        query = query.filter(Restaurant.status == status)

    pagination = query.order_by(Restaurant.id.asc()).paginate(page=page, per_page=per_page, error_out=False)
    restaurants = pagination.items
    
    return jsonify({
        'restaurants': [serialize_restaurant(r) for r in restaurants],
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'total_restaurants': pagination.total
    }), 200

@admin_bp.route('/restaurants/<int:restaurant_id>', methods=['DELETE'])
@requires_auth(allowed_roles=['manager', 'admin'])
def suspend_restaurant(payload, restaurant_id):
    """تعليق مطعم (حذف ناعم)."""
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({"success": False, "message": "Restaurant not found"}), 404
    
    restaurant.status = 'suspended'
    db.session.commit()
    return jsonify({"success": True, "message": "Restaurant has been suspended."}), 200

@admin_bp.route('/restaurants/<int:restaurant_id>/unsuspend', methods=['POST'])
@requires_auth(allowed_roles=['manager', 'admin'])
def unsuspend_restaurant(payload, restaurant_id):
    """إعادة تفعيل مطعم معلق."""
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({"success": False, "message": "Restaurant not found"}), 404
    
    restaurant.status = 'active'
    db.session.commit()
    return jsonify({"success": True, "message": "Restaurant has been reactivated."}), 200

@admin_bp.route('/restaurants/<int:restaurant_id>/force-delete', methods=['POST'])
@requires_auth(allowed_roles=['manager', 'admin']) # يفضل أن يكون للأدمن الأعلى فقط
def force_delete_restaurant(payload, restaurant_id):
    """الحذف النهائي لمطعم وجميع بياناته المرتبطة به."""
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({"success": False, "message": "Restaurant not found"}), 404
    
    # --- جديد: جمع أسماء ملفات الصور المراد حذفها ---
    public_ids_to_delete = []
    
    # 1. شعار المطعم
    if restaurant.logo_url:
        public_id = extract_public_id_from_url(restaurant.logo_url)
        if public_id:
            public_ids_to_delete.append(public_id)

    menu_items_ids = [item.id for item in restaurant.menu_items]
    if menu_items_ids:
        images = MenuItemImage.query.filter(MenuItemImage.menu_item_id.in_(menu_items_ids)).all()
        for img in images:
            public_id = extract_public_id_from_url(img.image_url)
            if public_id:
                public_ids_to_delete.append(public_id)


    try:
        # إعادة تعيين أدوار المستخدمين المرتبطين بالمطعم
        users_to_reset = User.query.filter_by(associated_restaurant_id=restaurant.id).all()
        for user in users_to_reset:
            user.role = 'customer'
            user.associated_restaurant_id = None
        
        # الحذف من قاعدة البيانات (سيشمل كل شيء مرتبط بسبب cascade)
        db.session.delete(restaurant)
        db.session.commit()
        return jsonify({"success": True, "message": "Restaurant has been permanently deleted."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500

# --- إدارة طلبات المطاعم ---

@admin_bp.route('/restaurant_applications', methods=['GET'])
@requires_auth(allowed_roles=['manager', 'admin'])
def get_restaurant_applications(payload):
    """جلب جميع طلبات المطاعم المعلقة مع ترقيم الصفحات."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    query = RestaurantApplication.query.filter_by(status='pending')

    pagination = query.order_by(RestaurantApplication.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    applications = pagination.items
    
    return jsonify({
        'applications': [serialize_restaurant_application(app) for app in applications],
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'total_applications': pagination.total
    }), 200

@admin_bp.route('/restaurant_applications/<int:app_id>/approve', methods=['PUT'])
@requires_auth(allowed_roles=['manager', 'admin'])
def approve_restaurant_application(payload, app_id):
    """الموافقة على طلب مطعم."""
    application = RestaurantApplication.query.get(app_id)
    if not application or application.status != 'pending':
        return jsonify({"success": False, "message": "Application not found or not pending"}), 404

    user = User.query.get(application.user_id)
    if not user:
         return jsonify({"success": False, "message": "Associated user not found"}), 404

    user.role = 'restaurant_manager'
    
    location_wkt = WKTElement(f'POINT({application.location_lon} {application.location_lat})', srid=4326)
    
    delivery_area_wkt = None
    if application.delivery_area_geojson:
        try:
            # تم التعديل: إضافة طبقة حماية للتعامل مع البيانات المحفوظة كنص
            geojson_data = application.delivery_area_geojson
            if isinstance(geojson_data, str):
                geojson_data = json.loads(geojson_data) # تحليل النص إذا لزم الأمر
            
            geom_str = json.dumps(geojson_data)
            delivery_area_wkt = func.ST_GeomFromGeoJSON(geom_str)
        except Exception as e:
            print(f"Could not parse delivery_area_geojson: {e}")

    new_restaurant = Restaurant(
        name=application.restaurant_name,
        description=application.description,
        logo_url=application.logo_url,
        address=application.address,
        location=location_wkt,
        delivery_area=delivery_area_wkt,
        manager_id=user.id
    )
    db.session.add(new_restaurant)
    db.session.flush()

    user.associated_restaurant_id = new_restaurant.id
    application.status = 'approved'
    
    db.session.commit()
    return jsonify({"success": True, "message": "Application approved. Restaurant created."}), 200

@admin_bp.route('/restaurant_applications/<int:app_id>/reject', methods=['PUT'])
@requires_auth(allowed_roles=['manager', 'admin'])
def reject_restaurant_application(payload, app_id):
    """رفض طلب مطعم."""
    application = RestaurantApplication.query.get(app_id)
    if not application or application.status != 'pending':
        return jsonify({"success": False, "message": "Application not found or not pending"}), 404

    application.status = 'rejected'
    db.session.commit()
    return jsonify({"success": True, "message": "Application has been rejected."}), 200

# --- إدارة أدمن المطعم ---

@admin_bp.route('/restaurants/<int:restaurant_id>/add_admin', methods=['POST'])
@requires_auth(allowed_roles=['restaurant_manager'])
def add_restaurant_admin(payload, restaurant_id):
    """إضافة أدمن لمطعم (يتم بواسطة مدير المطعم)."""
    manager_id = payload['id']
    data = request.get_json()
    user_to_add_id = data.get('user_id')

    if not user_to_add_id:
        return jsonify({"success": False, "message": "User ID to add is required"}), 400

    restaurant = Restaurant.query.filter_by(id=restaurant_id, manager_id=manager_id).first()
    if not restaurant:
        return jsonify({"success": False, "message": "You are not the manager of this restaurant"}), 403

    user_to_add = User.query.get(user_to_add_id)
    if not user_to_add:
        return jsonify({"success": False, "message": "User to add not found"}), 404

    user_to_add.role = 'restaurant_admin'
    user_to_add.associated_restaurant_id = restaurant_id
    db.session.commit()

    return jsonify({"success": True, "message": f"User {user_to_add.name} is now an admin for restaurant {restaurant.name}"}), 200