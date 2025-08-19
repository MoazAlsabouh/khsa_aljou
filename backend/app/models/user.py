from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.sql import func
from sqlalchemy_utils import EmailType


class User(db.Model):
   __tablename__ = 'users'
   id = db.Column(db.Integer, primary_key=True)
   phone_number = db.Column(db.String(20), unique=True, nullable=False)
   email = db.Column(EmailType, unique=True, nullable=False)
   name = db.Column(db.String(100), nullable=False)
   profile_image_url = db.Column(db.String(255), nullable=True)
   password_hash = db.Column(db.Text, nullable=True)
   role = db.Column(db.String(50), nullable=False, default='customer')
   is_active = db.Column(db.Boolean, default=False)
   is_banned = db.Column(db.Boolean, default=False)
   oauth_provider = db.Column(db.String(50), nullable=True)
   email_verification_code = db.Column(db.String(10), nullable=True)
   email_code_expires_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)
   reset_password_code = db.Column(db.String(10), nullable=True)
   reset_code_expires_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)
   phone_number_verified = db.Column(db.Boolean, default=False)
   phone_verification_code = db.Column(db.String(10), nullable=True)
   phone_code_expires_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)
   associated_restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=True)
   # حقول لتحديد معدل طلبات تفعيل الإيميل
   email_verification_requests_count = db.Column(db.Integer, default=0, nullable=False)
   email_verification_requests_locked_until = db.Column(db.TIMESTAMP(timezone=True), nullable=True)
   # جديد: حقول لتحديد معدل طلبات تفعيل الهاتف
   phone_verification_requests_count = db.Column(db.Integer, default=0, nullable=False)
   phone_verification_requests_locked_until = db.Column(db.TIMESTAMP(timezone=True), nullable=True)
   
   created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())
   updated_at = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now())

   # العلاقات
   ratings_given = db.relationship('Rating', backref='rater', lazy=True, foreign_keys='Rating.user_id')
   orders = db.relationship('Order', backref='customer', lazy=True, foreign_keys='Order.user_id')
   sessions = db.relationship('Session', backref='user', lazy=True)
   applications = db.relationship('RestaurantApplication', backref='user', lazy=True)
   addresses = db.relationship('UserAddress', backref='user', lazy=True, cascade="all, delete-orphan")

   def set_password(self, password):
       self.password_hash = generate_password_hash(password)

   def check_password(self, password):
       if not self.password_hash:
           return False
       return check_password_hash(self.password_hash, password)

   def __repr__(self):
       return f'<User {self.name} ({self.role})>'