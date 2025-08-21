from flask import Blueprint
from app.routes.auth_routes import auth_api_bp # تم التعديل: استيراد Blueprint المصادقة الجديد
from app.routes.restaurants import restaurants_bp
from app.routes.orders import orders_bp
from app.routes.portal import portal_bp
from app.routes.user_routes import user_bp # تم الإضافة: استيراد Blueprint المستخدم الجديد
from app.routes.admin_routes import admin_bp
from .migrate import migrate_bp

api_bp = Blueprint('api', __name__)

def register_routes(app):
    api_bp.register_blueprint(auth_api_bp, url_prefix='/api/v1/auth')
    api_bp.register_blueprint(restaurants_bp, url_prefix='/api/v1/restaurants')
    api_bp.register_blueprint(orders_bp, url_prefix='/api/v1/orders')
    api_bp.register_blueprint(portal_bp, url_prefix='/api/v1/portal')
    api_bp.register_blueprint(user_bp, url_prefix='/api/v1/users')
    api_bp.register_blueprint(admin_bp, url_prefix='/api/v1/admin')
    api_bp.register_blueprint(migrate_bp, url_prefix='/api/v1/migrate')


    app.register_blueprint(api_bp)