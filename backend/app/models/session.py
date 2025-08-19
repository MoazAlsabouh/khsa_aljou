from app.extensions import db
from sqlalchemy.sql import func
import uuid # لاستخدام UUIDs

class Session(db.Model):
    __tablename__ = 'sessions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4())) # UUID كـ ID للجلسة
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    refresh_token_jti = db.Column(db.String(36), unique=True, nullable=False) # JTI لـ Refresh Token الحالي
    session_version = db.Column(db.Integer, default=1, nullable=False) # إصدار الجلسة
    revoked = db.Column(db.Boolean, default=False, nullable=False) # هل تم إبطال الجلسة؟
    created_at = db.Column(db.TIMESTAMP(timezone=True), server_default=func.now())
    last_used_at = db.Column(db.TIMESTAMP(timezone=True), onupdate=func.now(), server_default=func.now())
    expires_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)

    def __repr__(self):
        return f'<Session {self.id} for User {self.user_id}>'
