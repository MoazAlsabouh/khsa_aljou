from app.extensions import db

class MenuItemImage(db.Model):
    __tablename__ = 'menu_item_images'
    id = db.Column(db.Integer, primary_key=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey('menu_items.id'), nullable=False)
    image_url = db.Column(db.String(255), nullable=False)

    def __repr__(self):
        return f'<Image for MenuItem {self.menu_item_id}>'