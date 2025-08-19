from app.extensions import db
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

class RestaurantApplication(db.Model):
    __tablename__ = 'restaurant_applications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # حقول مفصلة لبيانات المطعم
    restaurant_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    logo_url = db.Column(db.String(255), nullable=True)
    address = db.Column(db.Text, nullable=False)
    # تخزين الموقع كنقاط عشرية بسيطة في الطلب
    location_lat = db.Column(db.Float, nullable=False)
    location_lon = db.Column(db.Float, nullable=False)
    # تخزين منطقة التوصيل كنص GeoJSON
    delivery_area_geojson = db.Column(JSONB, nullable=True)
    
    status = db.Column(db.String(50), nullable=False, default='pending') # pending, approved, rejected
    created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f'<RestaurantApplication for {self.restaurant_name} by User {self.user_id}>'