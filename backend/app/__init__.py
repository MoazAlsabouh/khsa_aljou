from flask import Flask
from flask_migrate import Migrate
from dotenv import load_dotenv
from .extensions import db, cors # تم التعديل: استيراد db و cors من extensions
from .routes import register_routes # تم التعديل: استيراد دالة تسجيل المسارات
from .errors.handlers import register_error_handlers # تم التعديل: استيراد دالة تسجيل معالجات الأخطاء
from .auth.oauth import configure_oauth   # تم التعديل: استيراد دالة تهيئة OAuth من ملفها الجديد
import os
import cloudinary

migrate = Migrate()

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')
    app.secret_key = app.config.get("SECRET_KEY") # استخدام SECRET_KEY من Config

    # --- جديد: تهيئة Cloudinary ---
    cloudinary.config(
        cloud_name = app.config['CLOUDINARY_CLOUD_NAME'],
        api_key = app.config['CLOUDINARY_API_KEY'],
        api_secret = app.config['CLOUDINARY_API_SECRET']
    )

    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app) # تهيئة CORS مع التطبيق

    register_routes(app) # تسجيل جميع مسارات الـ API (بما في ذلك المصادقة)
    register_error_handlers(app) # تسجيل معالجات الأخطاء
    configure_oauth(app) # تهيئة مصادقة OAuth

    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    # إنشاء مجلد الرفع إن لم يكن موجوداً
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except OSError as e:
        print(f"Error creating upload directory: {e}")
    return app

app = create_app()