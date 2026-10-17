from app.extensions import db
from sqlalchemy.sql import func

class Coupon(db.Model):
    __tablename__ = 'coupons'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255), nullable=True)
    discount_type = db.Column(db.String(20), nullable=False, default='percentage')  # 'percentage' أو 'fixed'
    discount_value = db.Column(db.Integer, nullable=False)  # نسبة مئوية (مثلاً 20) أو مبلغ ثابت بالعملة الجديدة (مثلاً 100 ل.س)
    min_order_amount = db.Column(db.Integer, nullable=False, default=0)
    max_discount_amount = db.Column(db.Integer, nullable=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=True)
    usage_limit = db.Column(db.Integer, nullable=True)
    used_count = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    expires_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)
    created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())

    def calculate_discount(self, subtotal: int) -> int:
        if subtotal < self.min_order_amount:
            return 0
        if self.discount_type == 'percentage':
            discount = int((subtotal * self.discount_value) / 100)
            if self.max_discount_amount and discount > self.max_discount_amount:
                discount = self.max_discount_amount
        else:
            discount = self.discount_value
        return min(discount, subtotal)

    def __repr__(self):
        return f'<Coupon {self.code} ({self.discount_type}: {self.discount_value})>'
