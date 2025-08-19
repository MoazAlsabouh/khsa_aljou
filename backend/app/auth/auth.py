from flask import request, jsonify, current_app
from functools import wraps
import jwt
from app.models import User, Session
from app.extensions import db
from datetime import datetime, timezone

class AuthError(Exception):
   def __init__(self, error, status_code):
       self.error = error
       self.status_code = status_code

def get_token_auth_header():
   auth = request.headers.get('Authorization', None)
   if not auth:
       raise AuthError({'code': 'authorization_header_missing', 'description': 'Authorization header is expected.'}, 401)

   parts = auth.split()
   if parts[0].lower() != 'bearer':
       raise AuthError({'code': 'invalid_header', 'description': 'Authorization header must start with "Bearer".'}, 401)
   elif len(parts) == 1:
       raise AuthError({'code': 'invalid_header', 'description': 'Token not found.'}, 401)
   elif len(parts) > 2:
       raise AuthError({'code': 'invalid_header', 'description': 'Authorization header must be bearer token.'}, 401)

   token = parts[1]
   return token

def requires_auth(allowed_roles=None):
   if allowed_roles is None:
       allowed_roles = []
   def decorator(f):
       @wraps(f)
       def wrapper(*args, **kwargs):
           try:
               token = get_token_auth_header()
               payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
               
               user_id = payload.get("id")
               user_role = payload.get("role")
               session_id = payload.get("session_id")
               token_session_version = payload.get("session_version")

               if not all([user_id, user_role, session_id, token_session_version is not None]):
                   raise AuthError({'code': 'invalid_payload', 'description': 'Token payload is incomplete.'}, 401)

               if user_role not in allowed_roles:
                   raise AuthError({'code': 'unauthorized', 'description': 'Permission not found.'}, 403)
               
               session_obj = Session.query.get(session_id)
               if not session_obj or session_obj.revoked or session_obj.expires_at < datetime.now(timezone.utc):
                   raise AuthError({'code': 'invalid_session', 'description': 'Session is invalid or has been revoked.'}, 401)
               
               if session_obj.session_version != token_session_version:
                   raise AuthError({'code': 'permissions_changed', 'description': 'User permissions have changed. Please log in again.'}, 401)

               session_obj.last_used_at = datetime.now(timezone.utc)
               db.session.commit()

               return f(payload, *args, **kwargs)
           # --- تم التعديل هنا ---
           # بدلاً من إثارة استثناء، سنقوم بإرجاع استجابة JSON مباشرة
           except jwt.ExpiredSignatureError:
               return jsonify({
                   'success': False,
                   'error': 401,
                   'message': 'Token has expired'
               }), 401
           except jwt.InvalidTokenError:
               return jsonify({
                   'success': False,
                   'error': 401,
                   'message': 'Invalid token'
               }), 401
           except AuthError as e:
               return jsonify({
                   'success': False,
                   'error': e.status_code,
                   'message': e.error.get('description', 'Authentication error')
               }), e.status_code
           except Exception as e:
               return jsonify({
                   'success': False,
                   'error': 500,
                   'message': f'An unexpected error occurred: {str(e)}'
               }), 500
       return wrapper
   return decorator