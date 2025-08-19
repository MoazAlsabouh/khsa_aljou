from app.extensions import db
from geoalchemy2 import Geometry
from sqlalchemy.sql import func

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='pending')
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    delivery_address = db.Column(db.Text, nullable=False)
    delivery_location = db.Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now())

    order_items = db.relationship('OrderItem', backref='order', lazy=True)
    payment = db.relationship('Payment', backref='order', uselist=False, lazy=True)
    rating = db.relationship('Rating', backref='order', uselist=False, lazy=True)

    def __repr__(self):
        return f'<Order {self.id} Status: {self.status}>'
