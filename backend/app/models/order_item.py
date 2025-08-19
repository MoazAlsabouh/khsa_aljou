from app.extensions import db 
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    menu_item_id = db.Column(db.Integer, db.ForeignKey('menu_items.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_at_order = db.Column(db.Numeric(10, 2), nullable=False)
    excluded_ingredients = db.Column(JSONB, nullable=True) # المكونات التي أزالها المستخدم
    notes = db.Column(db.Text, nullable=True) # ملاحظات إضافية من المستخدم

    menu_item = db.relationship('MenuItem', lazy=True)

    def __repr__(self):
        return f'<OrderItem {self.quantity}x {self.menu_item_id} for Order {self.order_id}>'
