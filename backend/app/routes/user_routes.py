from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import User, RestaurantApplication, UserAddress
from app.auth.auth import requires_auth
from app.utils.serializers import serialize_user, serialize_user_address
from app.utils.auth_helpers import generate_verification_code, generate_numeric_otp
from app.utils.email_utils import send_email_verification_code
from app.utils.sms_utils import send_sms_verification_email
from werkzeug.utils import secure_filename
from geoalchemy2.elements import WKTElement
import os
import uuid
import json

user_bp = Blueprint('user_bp', __name__)


def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@user_bp.route('/me', methods=['GET'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def get_user_profile(payload):
    user = User.query.get(payload['id'])
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    return jsonify({"success": True, "user": serialize_user(user)}), 200

@user_bp.route('/me', methods=['PUT'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def update_user_profile(payload):
    user = User.query.get(payload['id'])
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    # تم التعديل: استخدام request.form بدلاً من request.get_json()
    data = request.form
    
    if user.oauth_provider and ('email' in data or 'old_password' in data):
        return jsonify({"success": False, "message": "OAuth users cannot change email or password."}), 403

    response_messages = []
    re_verification_needed = {'email': False, 'phone': False}

    # --- 1. تحديث كلمة المرور ---
    if 'old_password' in data and 'new_password' in data:
        if not user.check_password(data['old_password']):
            return jsonify({"success": False, "message": "كلمة المرور القديمة غير صحيحة"}), 403
        user.set_password(data['new_password'])
        response_messages.append("تم تحديث كلمة المرور بنجاح.")

    # --- 2. تحديث الاسم ---
    if 'name' in data:
        user.name = data['name']
        response_messages.append("تم تحديث الاسم.")

    # --- 3. تحديث الصورة الشخصية (رفع ملف) ---
    if 'profile_image' in request.files:
        file = request.files['profile_image']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = str(uuid.uuid4()) + "_" + filename
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            if user.profile_image_url and not user.profile_image_url.startswith('http'):
                old_path = os.path.join(current_app.config['UPLOAD_FOLDER'], user.profile_image_url)
                if os.path.exists(old_path):
                    os.remove(old_path)

            user.profile_image_url = unique_filename
            response_messages.append("تم تحديث الصورة الشخصية.")
        elif file and file.filename != '':
            return jsonify({"success": False, "message": "نوع الملف غير مسموح به"}), 400

    # --- 4. تحديث البريد الإلكتروني ---
    if 'email' in data and data['email'] != user.email:
        new_email = data['email']
        if User.query.filter(User.email == new_email).first():
            return jsonify({"success": False, "message": "البريد الإلكتروني الجديد مستخدم بالفعل"}), 409
        
        user.email = new_email
        user.is_active = False
        verification_code = generate_verification_code()
        user.email_verification_code = verification_code
        send_email_verification_code(new_email, verification_code)
        response_messages.append("تم تحديث البريد الإلكتروني. يتطلب إعادة التفعيل.")
        re_verification_needed['email'] = True

    # --- 5. تحديث رقم الهاتف ---
    if 'phone_number' in data and data['phone_number'] != user.phone_number:
        new_phone = data['phone_number']
        if User.query.filter(User.phone_number == new_phone).first():
            return jsonify({"success": False, "message": "رقم الهاتف الجديد مستخدم بالفعل"}), 409
            
        user.phone_number = new_phone
        user.phone_number_verified = False
        otp_code = generate_numeric_otp()
        user.phone_verification_code = otp_code
        send_sms_verification_email(user, otp_code, method="email")
        response_messages.append("تم تحديث رقم الهاتف. يتطلب إعادة التفعيل.")
        re_verification_needed['phone'] = True

    if not response_messages and 'profile_image' not in request.files:
        return jsonify({"success": False, "message": "لم يتم تقديم أي بيانات للتحديث"}), 400

    try:
        db.session.commit()
        return jsonify({
            "success": True, 
            "message": " ".join(response_messages),
            "re_verification_needed": re_verification_needed,
            "user": serialize_user(user)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500
    
@user_bp.route('/apply_restaurant_manager', methods=['POST'])
@requires_auth(allowed_roles=['customer'])
def apply_for_restaurant_manager(payload):
    user = User.query.get(payload['id'])
    if not user.is_active or not user.phone_number_verified:
        return jsonify({"success": False, "message": "يجب توثيق البريد الإلكتروني ورقم الهاتف أولاً"}), 403

    data = request.form
    required_fields = ['restaurant_name', 'description', 'address', 'location_lat', 'location_lon']
    if not all(field in data for field in required_fields):
        return jsonify({"success": False, "message": "البيانات المطلوبة غير مكتملة"}), 400

    existing_app = RestaurantApplication.query.filter_by(user_id=user.id, status='pending').first()
    if existing_app:
        return jsonify({"success": False, "message": "لديك طلب قيد المراجعة بالفعل"}), 409

    logo_filename = None
    if 'logo' in request.files:
        file = request.files['logo']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            logo_filename = str(uuid.uuid4()) + "_" + filename
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], logo_filename)
            file.save(file_path)
        elif file and file.filename != '':
            return jsonify({"success": False, "message": "نوع ملف الشعار غير مسموح به"}), 400

    # تم التعديل: تحليل نص GeoJSON قبل حفظه
    delivery_area_geojson_str = data.get('delivery_area_geojson')
    delivery_area_geojson_obj = None
    if delivery_area_geojson_str:
        try:
            delivery_area_geojson_obj = json.loads(delivery_area_geojson_str)
        except json.JSONDecodeError:
            return jsonify({"success": False, "message": "Invalid GeoJSON format for delivery area."}), 400

    new_application = RestaurantApplication(
        user_id=user.id,
        restaurant_name=data['restaurant_name'],
        description=data.get('description'),
        logo_url=logo_filename,
        address=data['address'],
        location_lat=float(data['location_lat']),
        location_lon=float(data['location_lon']),
        delivery_area_geojson=delivery_area_geojson_obj # حفظ الكائن المحلل
    )
    db.session.add(new_application)
    db.session.commit()

    return jsonify({"success": True, "message": "تم إرسال طلبك المفصل بنجاح."}), 201

@user_bp.route('/me/addresses', methods=['POST'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def add_user_address(payload):
    """إضافة عنوان جديد وتعيينه كافتراضي إذا كان الأول."""
    user_id = payload['id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
        
    data = request.get_json()

    if not all(k in data for k in ['name', 'location']):
        return jsonify({"success": False, "message": "Name and location are required"}), 400
    
    location_data = data['location']
    if not all(k in location_data for k in ['latitude', 'longitude']):
        return jsonify({"success": False, "message": "Location must include latitude and longitude"}), 400

    try:
        location_wkt = WKTElement(f'POINT({location_data["longitude"]} {location_data["latitude"]})', srid=4326)
        
        # التحقق إذا كان هذا هو العنوان الأول للمستخدم
        is_first_address = not user.addresses

        new_address = UserAddress(
            user_id=user_id,
            name=data['name'],
            address_line=data.get('address_line'),
            location=location_wkt,
            is_default=is_first_address # تعيينه كافتراضي إذا كان الأول
        )
        db.session.add(new_address)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Address added successfully", "address": serialize_user_address(new_address)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500

@user_bp.route('/me/addresses', methods=['GET'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def get_user_addresses(payload):
    """جلب جميع العناوين المحفوظة للمستخدم الحالي."""
    user = User.query.get(payload['id'])
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
        
    return jsonify([serialize_user_address(addr) for addr in user.addresses]), 200

@user_bp.route('/me/addresses/default', methods=['GET'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def get_default_address(payload):
    """جلب العنوان الافتراضي للمستخدم الحالي."""
    default_address = UserAddress.query.filter_by(user_id=payload['id'], is_default=True).first()
    if not default_address:
        return jsonify({"success": False, "message": "No default address has been set."}), 404
        
    return jsonify(serialize_user_address(default_address)), 200

@user_bp.route('/me/addresses/<int:address_id>', methods=['PUT'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def update_user_address(payload, address_id):
    """تحديث عنوان محفوظ."""
    address = UserAddress.query.filter_by(id=address_id, user_id=payload['id']).first()
    if not address:
        return jsonify({"success": False, "message": "Address not found"}), 404
        
    data = request.get_json()
    address.name = data.get('name', address.name)
    address.address_line = data.get('address_line', address.address_line)
    
    if 'location' in data:
        location_data = data['location']
        address.location = WKTElement(f'POINT({location_data["longitude"]} {location_data["latitude"]})', srid=4326)
        
    db.session.commit()
    return jsonify({"success": True, "message": "Address updated successfully", "address": serialize_user_address(address)}), 200

@user_bp.route('/me/addresses/<int:address_id>', methods=['DELETE'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def delete_user_address(payload, address_id):
    """حذف عنوان محفوظ."""
    address = UserAddress.query.filter_by(id=address_id, user_id=payload['id']).first()
    if not address:
        return jsonify({"success": False, "message": "Address not found"}), 404
        
    db.session.delete(address)
    db.session.commit()
    return jsonify({"success": True, "message": "Address deleted successfully"}), 200

@user_bp.route('/me/addresses/<int:address_id>/set-default', methods=['POST'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def set_default_address(payload, address_id):
    """تعيين عنوان كافتراضي."""
    user_id = payload['id']
    address_to_set = UserAddress.query.filter_by(id=address_id, user_id=user_id).first()
    
    if not address_to_set:
        return jsonify({"success": False, "message": "Address not found"}), 404
        
    try:
        # إلغاء تعيين أي عنوان افتراضي قديم
        UserAddress.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})
        
        # تعيين العنوان الجديد كافتراضي
        address_to_set.is_default = True
        
        db.session.commit()
        return jsonify({"success": True, "message": f"Address '{address_to_set.name}' is now the default."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500