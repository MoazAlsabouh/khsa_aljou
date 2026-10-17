import os
from dotenv import load_dotenv

# محاولة تحميل .env من مسار app/.env أولاً ثم المسار الحالي
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

def get_database_url():
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        return None
    url = raw_url.strip().strip('"').strip("'")
    # تصحيح بادئة postgres:// الخاصة بـ Render/Heroku لتصبح postgresql:// المتوافقة مع SQLAlchemy 2.0
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

def clean_env(key, default=None):
    val = os.getenv(key, default)
    if val and isinstance(val, str):
        return val.strip().strip('"').strip("'")
    return val

class Config:
    # URI اتصال قاعدة البيانات PostgreSQL
    SQLALCHEMY_DATABASE_URI = get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # إعدادات Flask-JWT-Extended
    JWT_SECRET_KEY = clean_env("JWT_SECRET_KEY")
    SECRET_KEY = clean_env("SECRET_KEY") 

    # إعدادات رفع الملفات
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    # Cloudinary Credentials
    CLOUDINARY_CLOUD_NAME = clean_env("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = clean_env("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = clean_env("CLOUDINARY_API_SECRET")

    # Google Auth
    GOOGLE_CLIENT_ID = clean_env("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = clean_env("GOOGLE_CLIENT_SECRET")

    # GitHub Auth
    GITHUB_CLIENT_ID = clean_env("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET = clean_env("GITHUB_CLIENT_SECRET")

    # Facebook Auth
    FACEBOOK_CLIENT_ID = clean_env("FACEBOOK_CLIENT_ID")
    FACEBOOK_CLIENT_SECRET = clean_env("FACEBOOK_CLIENT_SECRET")
