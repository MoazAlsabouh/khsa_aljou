from flask import Blueprint, request, jsonify, url_for, redirect
from app.extensions import db
from app.models import User, Session
from app.auth.auth import requires_auth, AuthError
from app.utils.token_utils import generate_token, decode_token, generate_refresh_token
from app.utils.auth_helpers import generate_verification_code, generate_unique_oauth_phone_placeholder, generate_numeric_otp
from app.utils.email_utils import send_email_verification_code
from app.utils.sms_utils import send_sms
from app.auth.oauth import oauth
from app.utils.serializers import serialize_user
from datetime import datetime, timedelta, timezone
import jwt
import uuid
import os
from dotenv import load_dotenv

load_dotenv()
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

auth_api_bp = Blueprint('auth_api', __name__)

# --- مسارات المصادقة المحلية والتحقق ---
@auth_api_bp.route('/register', methods=['POST'])
def register():
   data = request.get_json()
   phone_number = data.get('phone_number')
   email = data.get('email')
   name = data.get('name')
   password = data.get('password')

   if not all([phone_number, email, name, password]):
       return jsonify({"success": False, "message": "جميع الحقول (رقم الهاتف، البريد الإلكتروني، الاسم، كلمة المرور) مطلوبة"}), 400

   if User.query.filter_by(phone_number=phone_number).first():
       return jsonify({"success": False, "message": "رقم الهاتف مستخدم مسبقًا"}), 409

   if User.query.filter_by(email=email).first():
       return jsonify({"success": False, "message": "البريد الإلكتروني مستخدم مسبقًا"}), 409

   try:
       email_verification_code = generate_verification_code()
       expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
       new_user = User(
           phone_number=phone_number,
           email=email,
           name=name,
           role='customer',
           is_active=False,
           email_verification_code=email_verification_code,
           email_code_expires_at=expires_at,
           verification_requests_count=1,
           phone_verification_requests_count=0
       )
       new_user.set_password(password)
       db.session.add(new_user)
       db.session.commit()

       send_email_verification_code(email, email_verification_code)
       return jsonify({"success": True, "message": "تم التسجيل بنجاح. يرجى تأكيد بريدك الإلكتروني."}), 201
   except Exception as e:
       db.session.rollback()
       return jsonify({'message': f'حدث خطأ: {str(e)}'}), 500

@auth_api_bp.route('/verify-email', methods=['POST'])
def verify_email():
   data = request.get_json()
   email = data.get('email')
   code = data.get('code')

   if not email or not code:
       return jsonify({"success": False, "message": "البريد الإلكتروني والرمز مطلوبان"}), 400

   user = User.query.filter_by(email=email).first()
   if not user or user.email_verification_code != code:
       return jsonify({"success": False, "message": "رمز غير صحيح أو المستخدم غير موجود"}), 400

   user.is_active = True
   user.email_verification_code = None
   user.email_code_expires_at = None
   user.verification_requests_count = 0
   user.verification_requests_locked_until = None
   db.session.commit()

   return jsonify({"success": True, "message": "تم تأكيد البريد الإلكتروني وتم تفعيل الحساب"}), 200

@auth_api_bp.route('/resend-verification', methods=['POST'])
def resend_verification_email():
    """إعادة إرسال كود تفعيل البريد الإلكتروني مع تحديد المعدل."""
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"success": False, "message": "البريد الإلكتروني مطلوب"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"success": True, "message": "إذا كان البريد مسجلاً، سيتم إرسال كود جديد."}), 200

    if user.is_active:
        return jsonify({"success": False, "message": "هذا الحساب مفعل بالفعل."}), 400

    # --- منطق تحديد المعدل ---
    now = datetime.now(timezone.utc)
    if user.verification_requests_locked_until and user.verification_requests_locked_until > now:
        wait_time = user.verification_requests_locked_until - now
        return jsonify({"success": False, "message": f"لقد تجاوزت الحد المسموح به. يرجى المحاولة مرة أخرى بعد {str(wait_time).split('.')[0]}."}), 429

    if user.verification_requests_count >= 5:
        user.verification_requests_locked_until = now + timedelta(days=1)
        user.verification_requests_count = 0 # تصفير العداد للدورة القادمة
        db.session.commit()
        return jsonify({"success": False, "message": "لقد تجاوزت الحد المسموح به. تم قفل الطلبات لمدة 24 ساعة."}), 429

@auth_api_bp.route('/request-password-reset', methods=['POST'])
def request_password_reset():
   data = request.get_json()
   email = data.get('email')

   if not email:
       return jsonify({"success": False, "message": "البريد الإلكتروني مطلوب"}), 400

   user = User.query.filter_by(email=email).first()
   if not user:
       return jsonify({"success": True, "message": "إذا كان البريد موجودًا، سيتم إرسال التعليمات إليه"}), 200

   code = generate_verification_code()
   user.reset_password_code = code
   user.reset_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
   db.session.commit()

   send_email_verification_code(user.email, code)
   return jsonify({"success": True, "message": "تم إرسال رمز إعادة تعيين كلمة المرور"}), 200

@auth_api_bp.route('/reset-password', methods=['POST'])
def reset_password():
   data = request.get_json()
   email = data.get('email')
   code = data.get('code')
   new_password = data.get('new_password')

   if not all([email, code, new_password]):
       return jsonify({"success": False, "message": "البيانات ناقصة"}), 400

   user = User.query.filter_by(email=email).first()

   if not user or user.reset_password_code != code or datetime.now(timezone.utc) > user.reset_code_expires_at:
       return jsonify({"success": False, "message": "الرمز غير صحيح أو منتهي الصلاحية"}), 400

   user.set_password(new_password)
   user.reset_password_code = None
   user.reset_code_expires_at = None
   db.session.commit()

   return jsonify({"success": True, "message": "تم تعيين كلمة المرور الجديدة"}), 200

@auth_api_bp.route('/request-phone-verification-code', methods=['POST'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def request_phone_verification_code(payload):
   user = User.query.get(payload['id'])
   if not user:
       return jsonify({"success": False, "message": "المستخدم غير موجود"}), 404
   
   if user.phone_number_verified:
       return jsonify({"success": True, "message": "رقم الهاتف مؤكد بالفعل"}), 200

   # --- منطق تحديد المعدل ---
   now = datetime.now(timezone.utc)
   if user.phone_verification_requests_locked_until and user.phone_verification_requests_locked_until > now:
       wait_time = user.phone_verification_requests_locked_until - now
       return jsonify({"success": False, "message": f"لقد تجاوزت الحد المسموح به. يرجى المحاولة مرة أخرى بعد {str(wait_time).split('.')[0]}."}), 429

   if user.phone_verification_requests_count >= 5:
       user.phone_verification_requests_locked_until = now + timedelta(days=1)
       user.phone_verification_requests_count = 0
       db.session.commit()
       return jsonify({"success": False, "message": "لقد تجاوزت الحد المسموح به. تم قفل الطلبات لمدة 24 ساعة."}), 429

   user.phone_verification_requests_count += 1
   code = generate_numeric_otp()
   user.phone_verification_code = code
   user.phone_code_expires_at = now + timedelta(minutes=5)
   db.session.commit()

#    send_sms(user.phone_number, f"رمز التحقق الخاص بك هو: {code}")
   send_sms(user, code)
   return jsonify({"success": True, "message": f"تم إرسال رمز التحقق. المحاولات المتبقية: {5 - user.phone_verification_requests_count}"}), 200

@auth_api_bp.route('/verify-phone', methods=['POST'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def verify_phone(payload):
   user = User.query.get(payload['id'])
   if not user:
       return jsonify({"success": False, "message": "المستخدم غير موجود"}), 404

   data = request.get_json()
   code = data.get('code')

   if not code:
       return jsonify({"success": False, "message": "رمز التحقق مطلوب"}), 400

   if not user.phone_verification_code or user.phone_verification_code != code or user.phone_code_expires_at < datetime.now(timezone.utc):
       return jsonify({"success": False, "message": "رمز غير صحيح أو منتهي الصلاحية"}), 400

   user.phone_number_verified = True
   user.phone_verification_code = None
   user.phone_code_expires_at = None
   # إعادة تصفير العداد والقفل عند النجاح
   user.phone_verification_requests_count = 0
   user.phone_verification_requests_locked_until = None
   db.session.commit()

   return jsonify({"success": True, "message": "تم تأكيد رقم الهاتف بنجاح"}), 200

@auth_api_bp.route('/login', methods=['POST'])
def login():
   data = request.get_json()
   identifier = data.get('identifier')
   password = data.get('password')

   if not identifier or not password:
       return jsonify({"success": False, "message": "رقم الهاتف/البريد وكلمة المرور مطلوبان"}), 400

   user = User.query.filter((User.phone_number == identifier) | (User.email == identifier)).first()

   if user is None or not user.check_password(password):
       return jsonify({"success": False, "message": "بيانات الدخول غير صحيحة"}), 401
   
   if not user.is_active:
       return jsonify({"success": False, "message": "الحساب غير نشط. يرجى تفعيل حسابك."}), 403
   
   if user.is_banned:
       return jsonify({"success": False, "message": "هذا الحساب محظور"}), 403

   if user.oauth_provider:
       return jsonify({"success": False, "message": f"يرجى تسجيل الدخول باستخدام {user.oauth_provider}"}), 403

   session_id = uuid.uuid4()
   refresh_token_value, refresh_token_jti = generate_refresh_token(session_id)
   
   new_session = Session(
       id=str(session_id),
       user_id=user.id,
       refresh_token_jti=refresh_token_jti,
       expires_at=datetime.now(timezone.utc) + timedelta(days=30),
       user_agent=request.headers.get('User-Agent'),
       ip_address=request.remote_addr
   )
   db.session.add(new_session)
   db.session.commit()

   access_token = generate_token(user, new_session.id, new_session.session_version)
   
   return jsonify({
       "success": True,
       "access_token": access_token,
       "refresh_token": refresh_token_value,
       "user": serialize_user(user)
   }), 200

@auth_api_bp.route('/refresh', methods=['POST'])
def refresh_token():
   data = request.get_json()
   refresh_token = data.get('refresh_token')

   if not refresh_token:
       return jsonify({"success": False, "message": "Refresh token is missing"}), 400

   try:
       refresh_payload = decode_token(refresh_token)
       session_id = refresh_payload.get('session_id')
       refresh_token_jti = refresh_payload.get('jti')

       session_obj = Session.query.get(session_id)
       if not session_obj or session_obj.revoked or session_obj.expires_at < datetime.now(timezone.utc) or session_obj.refresh_token_jti != refresh_token_jti:
           raise AuthError({'error': 'Invalid or expired session.', 'status_code': 401}, 401)
       
       user = User.query.get(session_obj.user_id)
       if not user:
           raise AuthError({'error': 'User not found.', 'status_code': 404}, 404)
       
       new_access_token = generate_token(user, session_obj.id, session_obj.session_version)
       new_refresh_token_value, new_refresh_token_jti = generate_refresh_token(session_obj.id)

       session_obj.refresh_token_jti = new_refresh_token_jti
       session_obj.last_used_at = datetime.now(timezone.utc)
       db.session.commit()

       return jsonify({
           "success": True,
           "access_token": new_access_token,
           "refresh_token": new_refresh_token_value
       }), 200

   except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, AuthError) as e:
       status_code = e.status_code if isinstance(e, AuthError) else 401
       error_message = e.error['error'] if isinstance(e, AuthError) else "Invalid or expired refresh token"
       return jsonify({"success": False, "message": error_message}), status_code
   except Exception as e:
       db.session.rollback()
       return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500

@auth_api_bp.route('/logout', methods=['POST'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def logout(payload):
   session_id = payload.get('session_id')
   session_obj = Session.query.get(session_id)
   if session_obj:
       session_obj.revoked = True
       db.session.commit()
   return jsonify({"success": True, "message": "Logged out successfully"}), 200

@auth_api_bp.route('/logout_all_sessions', methods=['POST'])
@requires_auth(allowed_roles=['customer', 'restaurant_admin', 'restaurant_manager', 'manager', 'admin'])
def logout_all_sessions(payload):
   user_id = payload.get('id')
   user_sessions = Session.query.filter_by(user_id=user_id, revoked=False).all()
   for s in user_sessions:
       s.revoked = True
   db.session.commit()
   return jsonify({"success": True, "message": "Logged out from all sessions successfully"}), 200

# --- مسارات OAuth ---
@auth_api_bp.route('/oauth/login/<name>')
def login_oauth(name):
   redirect_uri = url_for('api.auth_api.authorize', name=name, _external=True)
   return oauth.create_client(name).authorize_redirect(redirect_uri)

@auth_api_bp.route('/oauth/authorize/<name>')
def authorize(name):
   try:
       client = oauth.create_client(name)
       if not client:
           return redirect(f"{FRONTEND_URL}/auth/callback?error=OAuth client not configured")

       token = client.authorize_access_token()
       user_info = {}
       email = None
       user_name = None
       profile_pic = None
       
       if name == 'google':
           user_info = oauth.google.userinfo()
           email = user_info.get('email')
           user_name = user_info.get('name')
           profile_pic = user_info.get('picture')
       elif name == 'github':
           resp = client.get('user')
           resp.raise_for_status()
           user_info = resp.json()
           email = user_info.get('email')
           user_name = user_info.get('name') or user_info.get('login')
           profile_pic = user_info.get('avatar_url')
       elif name == 'facebook':
           resp = client.get('me?fields=id,name,email')
           resp.raise_for_status()
           user_info = resp.json()
           email = user_info.get('email')
           user_name = user_info.get('name')
           pic_resp = client.get(f"{user_info['id']}/picture?type=large&redirect=false")
           pic_resp.raise_for_status()
           profile_pic = pic_resp.json().get('data', {}).get('url')

       if not email:
           return redirect(f"{FRONTEND_URL}/auth/callback?error=لم يتم الحصول على البريد الإلكتروني")
       
       user = User.query.filter_by(email=email).first()

       if user:
           if not user.oauth_provider or user.oauth_provider != name:
               return redirect(f"{FRONTEND_URL}/auth/callback?error=هذا البريد مسجل بطريقة أخرى")
       else:
           user = User(
               email=email,
               phone_number=generate_unique_oauth_phone_placeholder(),
               name=user_name,
               role='customer',
               is_active=True,
               phone_number_verified=False,
               password_hash=None,
               oauth_provider=name,
               profile_image_url=profile_pic if profile_pic else 'https://placehold.co/400x400/EFEFEF/AAAAAA?text=User'
           )
           db.session.add(user)
           db.session.commit()
       
       session_id = uuid.uuid4()
       refresh_token_value, refresh_token_jti = generate_refresh_token(session_id)
       
       new_session = Session(
           id=str(session_id),
           user_id=user.id,
           refresh_token_jti=refresh_token_jti,
           expires_at=datetime.now(timezone.utc) + timedelta(days=30),
           user_agent=request.headers.get('User-Agent'),
           ip_address=request.remote_addr
       )
       db.session.add(new_session)
       db.session.commit()

       access_token = generate_token(user, new_session.id, new_session.session_version)
       
       return redirect(f"{FRONTEND_URL}/auth/callback?token={access_token}&refresh_token={refresh_token_value}")

   except Exception as e:
       db.session.rollback()
       return redirect(f"{FRONTEND_URL}/auth/callback?error=فشل تسجيل الدخول عبر OAuth: {str(e)}")