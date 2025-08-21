import os
from dotenv import load_dotenv

load_dotenv()  # لتحميل متغيرات البيئة من ملف .env

class Config:
    # URI اتصال قاعدة البيانات PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")  # يجب أن يحتوي .env على رابط البوستغرس
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # إعدادات Flask-JWT-Extended
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY") 

    # إعدادات رفع الملفات
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    # Cloudinary Credentials
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")


    # Google Auth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

    # GitHub Auth
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

    # Facebook Auth
    FACEBOOK_CLIENT_ID = os.getenv("FACEBOOK_CLIENT_ID")
    FACEBOOK_CLIENT_SECRET = os.getenv("FACEBOOK_CLIENT_SECRET")
