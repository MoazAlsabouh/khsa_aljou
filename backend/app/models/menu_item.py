from app.extensions import db
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB


class MenuItem(db.Model):
   __tablename__ = 'menu_items'
   id = db.Column(db.Integer, primary_key=True)
   restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
   name = db.Column(db.String(100), nullable=False)
   description = db.Column(db.Text, nullable=True)
   removable_ingredients = db.Column(JSONB, nullable=True) # e.g., ["بصل", "مخلل"]
   price = db.Column(db.Numeric(10, 2), nullable=False)
   is_available = db.Column(db.Boolean, default=True)
   created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())
   updated_at = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now())

   # جديد: علاقة مع صور المنتج
   images = db.relationship('MenuItemImage', backref='menu_item', lazy=True, cascade="all, delete-orphan")

   def __repr__(self):
       return f'<MenuItem {self.name} from {self.restaurant_id}>'