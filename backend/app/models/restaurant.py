from app.extensions import db
from geoalchemy2 import Geometry
from sqlalchemy.sql import func

class Restaurant(db.Model):
   __tablename__ = 'restaurants'
   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   description = db.Column(db.Text, nullable=True)
   logo_url = db.Column(db.String(255), nullable=True, default='https://placehold.co/600x400/EFEFEF/AAAAAA?text=Logo')
   address = db.Column(db.Text, nullable=False)
   location = db.Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
   delivery_area = db.Column(Geometry(geometry_type='POLYGON', srid=4326), nullable=True)
   manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
   status = db.Column(db.String(50), nullable=False, default='active') # 'active', 'suspended'
   created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())
   updated_at = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now())

   menu_items = db.relationship('MenuItem', backref='restaurant', lazy=True, cascade="all, delete-orphan")
   orders = db.relationship('Order', backref='restaurant_obj', lazy=True, cascade="all, delete-orphan")

   def __repr__(self):
       return f'<Restaurant {self.name}>'