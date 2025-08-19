import jwt
from datetime import datetime, timedelta, timezone
from flask import current_app
import uuid # تم الإضافة لاستخدام UUIDs
import os
from dotenv import load_dotenv

load_dotenv()

def get_jwt_secret_key():
    try:
        return current_app.config["JWT_SECRET_KEY"]
    except RuntimeError:
        # fallback إذا لم يكن داخل التطبيق
        return os.getenv("JWT_SECRET_KEY", "default-fallback-secret")

def generate_token(user, session_id, session_version):
    """
    Creates a custom JWT Access Token for a given user and session.
    Access token validity is short (e.g., 15 minutes).
    """
    payload = {
        'id': user.id,
        'role': user.role,
        'session_id': str(session_id),
        'session_version': session_version,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=15), # صلاحية Access Token (15 دقيقة)
        'iat': datetime.now(timezone.utc)
    }
    secret = get_jwt_secret_key()
    token = jwt.encode(payload, secret, algorithm='HS256')
    return token

def generate_refresh_token(session_id):
    """
    Creates a custom JWT Refresh Token.
    Refresh token validity is longer (e.g., 30 days).
    """
    refresh_token_jti = str(uuid.uuid4()) # JTI فريد لكل Refresh Token
    payload = {
        'session_id': str(session_id),
        'jti': refresh_token_jti,
        'exp': datetime.now(timezone.utc) + timedelta(days=30), # صلاحية Refresh Token (30 يوم)
        'iat': datetime.now(timezone.utc)
    }
    secret = get_jwt_secret_key()
    token = jwt.encode(payload, secret, algorithm='HS256'), refresh_token_jti
    return token

def decode_token(token):
    """
    Decodes a JWT token.
    """
    try:
        secret = get_jwt_secret_key()
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise jwt.ExpiredSignatureError("Token has expired")
    except jwt.InvalidTokenError:
        raise jwt.InvalidTokenError("Invalid token")