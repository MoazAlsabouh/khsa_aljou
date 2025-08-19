from app.extensions import db
from geoalchemy2 import Geometry
from sqlalchemy.sql import func

class UserAddress(db.Model):
    __tablename__ = 'user_addresses'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False) # e.g., "المنزل", "العمل"
    address_line = db.Column(db.Text, nullable=True) # e.g., "شارع الملك فهد، مبنى 5"
    location = db.Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())

    def __repr__(self):
        return f'<UserAddress {self.name} for User {self.user_id}>'
