from app.extensions import db # تم التعديل
from sqlalchemy.sql import func

class Rating(db.Model):
    __tablename__ = 'ratings'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    restaurant_rating = db.Column(db.SmallInteger, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f'<Rating {self.restaurant_rating} for Order {self.order_id}>'
