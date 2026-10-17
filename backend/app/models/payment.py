from app.extensions import db # تم التعديل
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), unique=True, nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(10), default='SYP', nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    gateway_name = db.Column(db.String(50), nullable=True)
    gateway_response = db.Column(JSONB, nullable=True)
    payment_url = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='pending')
    transaction_id = db.Column(db.String(255), unique=True, nullable=True)
    created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f'<Payment {self.id} Status: {self.status}>'
