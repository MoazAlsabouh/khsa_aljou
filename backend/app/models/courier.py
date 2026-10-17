from app.extensions import db
from geoalchemy2 import Geometry
from sqlalchemy.sql import func

class Courier(db.Model):
    __tablename__ = 'couriers'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    vehicle_type = db.Column(db.String(50), nullable=True) # e.g., 'motorcycle', 'bicycle', 'car'
    vehicle_plate = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='offline') # offline, available, busy
    current_location = db.Column(Geometry(geometry_type='POINT', srid=4326), nullable=True)
    last_location_update = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now())
    created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())

    user = db.relationship('User', backref=db.backref('courier_profile', uselist=False))
    orders = db.relationship('Order', backref='courier', lazy=True)

    def __repr__(self):
        return f'<Courier {self.id} (User: {self.user_id})>'
