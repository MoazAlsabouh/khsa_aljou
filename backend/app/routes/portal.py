from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import User, Restaurant, MenuItem, MenuItemImage, Order
from app.auth.auth import requires_auth
from app.utils.serializers import serialize_restaurant, serialize_menu_item, serialize_order, serialize_user
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, cast, Date
from datetime import datetime, timezone, timedelta
from werkzeug.utils import secure_filename
import json
import os
import uuid

portal_bp = Blueprint('portal', __name__)

def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def get_authorized_restaurant(payload):
    """دالة مساعدة للتحقق من صلاحيات مدير/أدمن المطعم وإرجاع المطعم المرتبط به."""
    user = User.query.get(payload['id'])
    if not user or user.role not in ['restaurant_manager', 'restaurant_admin']:
        return None
    
    restaurant = Restaurant.query.get(user.associated_restaurant_id)
    return restaurant

@portal_bp.route('/statistics', methods=['GET'])
@requires_auth(allowed_roles=['restaurant_manager', 'restaurant_admin'])
def get_portal_statistics(payload):
    """جلب إحصائيات المطعم لفترة زمنية محددة."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant:
        return jsonify({"success": False, "message": "Restaurant not found for this user"}), 404

    # --- 1. تحديد الفترة الزمنية ---
    period = request.args.get('period', 'weekly') # الخيارات: daily, weekly, monthly, custom
    today = datetime.now(timezone.utc).date()
    start_date = None
    end_date = None

    try:
        if period == 'daily':
            start_date = today
            end_date = today
        elif period == 'weekly':
            start_date = today - timedelta(days=today.weekday()) # Monday
            end_date = start_date + timedelta(days=6) # Sunday
        elif period == 'monthly':
            start_date = today.replace(day=1)
            # Find the last day of the month
            next_month = start_date.replace(day=28) + timedelta(days=4)
            end_date = next_month - timedelta(days=next_month.day)
        elif period == 'custom':
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            if not start_date_str or not end_date_str:
                return jsonify({"success": False, "message": "start_date and end_date are required for custom period"}), 400
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            # Default to weekly if period is invalid
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date format. Please use YYYY-MM-DD."}), 400

    # --- 2. حساب الإحصائيات الإجمالية للفترة المحددة ---
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    base_query = Order.query.filter(
        Order.restaurant_id == restaurant.id,
        Order.status == 'delivered',
        Order.created_at.between(start_datetime, end_datetime)
    )
    
    total_sales = db.session.query(func.sum(Order.total_price)).select_from(base_query.subquery()).scalar() or 0
    total_orders = base_query.count()
    average_order_value = total_sales / total_orders if total_orders > 0 else 0

    # --- 3. تجهيز بيانات المبيعات للرسم البياني ---
    sales_over_time = []
    delta = end_date - start_date
    day_names_ar = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']

    for i in range(delta.days + 1):
        current_day = start_date + timedelta(days=i)
        daily_sales = db.session.query(func.sum(Order.total_price)).filter(
            Order.restaurant_id == restaurant.id,
            Order.status == 'delivered',
            cast(Order.created_at, Date) == current_day
        ).scalar() or 0
        
        if period == 'weekly':
            label = day_names_ar[current_day.weekday()]
        else:
            label = current_day.strftime('%Y-%m-%d')
            
        sales_over_time.append({'date': label, 'sales': float(daily_sales)})

    stats = {
        "total_sales": float(total_sales),
        "total_orders": total_orders,
        "average_order_value": round(float(average_order_value), 2),
        "sales_over_time": sales_over_time,
        "period_info": {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
    }

    return jsonify(stats), 200


@portal_bp.route('/settings', methods=['PUT'])
@requires_auth(allowed_roles=['restaurant_manager'])
def update_restaurant_settings(payload):
    """تحديث إعدادات المطعم (فقط لمدير المطعم)."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant or restaurant.manager_id != payload['id']:
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    data = request.get_json()
    restaurant.name = data.get('name', restaurant.name)
    restaurant.description = data.get('description', restaurant.description)
    restaurant.logo_url = data.get('logo_url', restaurant.logo_url)
    restaurant.address = data.get('address', restaurant.address)
    
    location_data = data.get('location')
    if location_data:
        restaurant.location = WKTElement(f'POINT({location_data["longitude"]} {location_data["latitude"]})', srid=4326)

    delivery_area_coords = data.get('delivery_area')
    if delivery_area_coords:
        wkt_coords = [f"{c['longitude']} {c['latitude']}" for c in delivery_area_coords]
        if wkt_coords and wkt_coords[0] != wkt_coords[-1]:
            wkt_coords.append(wkt_coords[0])
        polygon_wkt = f"POLYGON(({', '.join(wkt_coords)}))"
        restaurant.delivery_area = WKTElement(polygon_wkt, srid=4326)

    try:
        db.session.commit()
        return jsonify({"success": True, "message": "Settings updated successfully", "restaurant": serialize_restaurant(restaurant)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500

@portal_bp.route('/orders', methods=['GET'])
@requires_auth(allowed_roles=['restaurant_manager', 'restaurant_admin'])
def get_portal_orders(payload):
    """جلب طلبات المطعم."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant:
        return jsonify({"success": False, "message": "Restaurant not found for this user"}), 404
        
    orders = Order.query.filter_by(restaurant_id=restaurant.id).order_by(Order.created_at.desc()).all()
    return jsonify([serialize_order(o) for o in orders]), 200

@portal_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@requires_auth(allowed_roles=['restaurant_manager', 'restaurant_admin'])
def update_order_status(payload, order_id):
    """تحديث حالة الطلب."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    order = Order.query.filter_by(id=order_id, restaurant_id=restaurant.id).first()
    if not order:
        return jsonify({"success": False, "message": "Order not found"}), 404
        
    data = request.get_json()
    new_status = data.get('status')
    if new_status and new_status in ['preparing', 'out_for_delivery', 'delivered', 'cancelled']:
        order.status = new_status
        db.session.commit()
        return jsonify({"success": True, "order": serialize_order(order)}), 200
    return jsonify({"success": False, "message": "Valid status is required"}), 400

@portal_bp.route('/menu', methods=['POST'])
@requires_auth(allowed_roles=['restaurant_manager'])
def portal_add_menu_item(payload):
    """إضافة عنصر جديد لقائمة الطعام مع الصور والمكونات."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant or restaurant.manager_id != payload['id']:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    data = request.form
    files = request.files.getlist('images')

    if not all(k in data for k in ['name', 'price']):
        return jsonify({"success": False, "message": "Name and price are required"}), 400

    # تم التعديل: معالجة المكونات القابلة للإزالة
    removable_ingredients_str = data.get('removable_ingredients')
    removable_ingredients_list = []
    if removable_ingredients_str:
        try:
            # قد تأتي المكونات كنص مفصول بفاصلة من الواجهة الأمامية
            removable_ingredients_list = [item.strip() for item in removable_ingredients_str.split(',')]
        except Exception:
            return jsonify({"success": False, "message": "Invalid format for removable ingredients."}), 400

    new_item = MenuItem(
        restaurant_id=restaurant.id,
        name=data['name'],
        price=data['price'],
        description=data.get('description'),
        is_available=data.get('is_available', 'true').lower() == 'true',
        removable_ingredients=removable_ingredients_list
    )
    db.session.add(new_item)
    db.session.flush()

    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = str(uuid.uuid4()) + "_" + filename
            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename))
            new_image = MenuItemImage(menu_item_id=new_item.id, image_url=unique_filename)
            db.session.add(new_image)
            
    db.session.commit()
    return jsonify({'success': True, 'message': 'Menu item added', 'menu_item': serialize_menu_item(new_item)}), 201

@portal_bp.route('/menu/<int:item_id>', methods=['PUT'])
@requires_auth(allowed_roles=['restaurant_manager', 'restaurant_admin'])
def portal_update_menu_item(payload, item_id):
    """تحديث عنصر في قائمة الطعام."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    menu_item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant.id).first()
    if not menu_item:
        return jsonify({"success": False, "message": "Menu item not found"}), 404

    data = request.form
    menu_item.name = data.get('name', menu_item.name)
    menu_item.description = data.get('description', menu_item.description)
    menu_item.price = data.get('price', menu_item.price)
    menu_item.is_available = data.get('is_available', str(menu_item.is_available)).lower() == 'true'
    
    # تم التعديل: تحديث المكونات القابلة للإزالة
    if 'removable_ingredients' in data:
        removable_ingredients_str = data.get('removable_ingredients')
        menu_item.removable_ingredients = [item.strip() for item in removable_ingredients_str.split(',')]

    db.session.commit()
    return jsonify({'success': True, 'message': 'Menu item updated', 'menu_item': serialize_menu_item(menu_item)}), 200

@portal_bp.route('/menu/<int:item_id>', methods=['DELETE'])
@requires_auth(allowed_roles=['restaurant_manager'])
def portal_delete_menu_item(payload, item_id):
    """حذف عنصر من قائمة الطعام."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant or restaurant.manager_id != payload['id']:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    menu_item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant.id).first()
    if not menu_item:
        return jsonify({"success": False, "message": "Menu item not found"}), 404
        
    db.session.delete(menu_item)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Menu item deleted'}), 200

@portal_bp.route('/menu/<int:item_id>/images', methods=['POST'])
@requires_auth(allowed_roles=['restaurant_manager', 'restaurant_admin'])
def portal_add_menu_item_image(payload, item_id):
    """إضافة صورة لعنصر في القائمة."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    menu_item = MenuItem.query.filter_by(id=item_id, restaurant_id=restaurant.id).first()
    if not menu_item:
        return jsonify({"success": False, "message": "Menu item not found"}), 404

    if 'image' not in request.files:
        return jsonify({'success': False, 'message': 'No image file provided'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = str(uuid.uuid4()) + "_" + filename
        file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename))
        
        new_image = MenuItemImage(menu_item_id=item_id, image_url=unique_filename)
        db.session.add(new_image)
        db.session.commit()
        
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
        full_image_url = f"{backend_url}/static/uploads/{unique_filename}"
        
        return jsonify({'success': True, 'message': 'Image added', 'image': {'id': new_image.id, 'url': full_image_url}}), 201

    return jsonify({'success': False, 'message': 'File type not allowed'}), 400

# --- إدارة فريق العمل (جديد) ---
@portal_bp.route('/team', methods=['GET'])
@requires_auth(allowed_roles=['restaurant_manager'])
def get_team_members(payload):
    """عرض فريق عمل المطعم (المشرفين)."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant or restaurant.manager_id != payload['id']:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    team_admins = User.query.filter_by(
        role='restaurant_admin',
        associated_restaurant_id=restaurant.id
    ).all()

    return jsonify([serialize_user(admin) for admin in team_admins]), 200

@portal_bp.route('/team/<int:admin_id>', methods=['DELETE'])
@requires_auth(allowed_roles=['restaurant_manager'])
def remove_team_member(payload, admin_id):
    """إزالة مشرف من فريق عمل المطعم."""
    restaurant = get_authorized_restaurant(payload)
    if not restaurant or restaurant.manager_id != payload['id']:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    admin_to_remove = User.query.get(admin_id)

    if not admin_to_remove:
        return jsonify({"success": False, "message": "Admin user not found."}), 404

    # التحقق من أن المستخدم المراد حذفه هو بالفعل مشرف في هذا المطعم
    if admin_to_remove.role != 'restaurant_admin' or admin_to_remove.associated_restaurant_id != restaurant.id:
        return jsonify({"success": False, "message": "This user is not an admin of your restaurant."}), 403
    
    # إعادته إلى مستخدم عادي وإلغاء ربطه بالمطعم
    admin_to_remove.role = 'customer'
    admin_to_remove.associated_restaurant_id = None
    
    try:
        db.session.commit()
        return jsonify({"success": True, "message": f"Admin {admin_to_remove.name} has been removed from the team."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500