from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from app.extensions import db
from app.models import Coupon
from app.auth.auth import requires_auth

coupon_bp = Blueprint('coupon_bp', __name__)


def serialize_coupon(c: Coupon):
    return {
        'id': c.id,
        'code': c.code,
        'description': c.description,
        'discount_type': c.discount_type,
        'discount_value': c.discount_value,
        'min_order_amount': c.min_order_amount,
        'max_discount_amount': c.max_discount_amount,
        'restaurant_id': c.restaurant_id,
        'usage_limit': c.usage_limit,
        'used_count': c.used_count,
        'is_active': c.is_active,
        'expires_at': c.expires_at.isoformat() if c.expires_at else None,
        'created_at': c.created_at.isoformat() if c.created_at else None
    }


def ensure_default_coupons():
    """إنشاء كوبونات ترحيبية افتراضية عند أول تشغيل لتسهيل التجربة."""
    if Coupon.query.count() == 0:
        welcome = Coupon(
            code='SHAM20',
            description='خصم 20% بمناسبة الانطلاقة في سوريا',
            discount_type='percentage',
            discount_value=20,
            min_order_amount=100,
            max_discount_amount=200,
            is_active=True
        )
        fixed_promo = Coupon(
            code='KHSA50',
            description='خصم فوري 50 ل.س بالعملة الجديدة',
            discount_type='fixed',
            discount_value=50,
            min_order_amount=150,
            is_active=True
        )
        db.session.add_all([welcome, fixed_promo])
        db.session.commit()


@coupon_bp.route('/active', methods=['GET'])
def get_active_coupons():
    """جلب الكوبونات الفعالة لعرضها للمستخدمين في السلة والواجهة."""
    ensure_default_coupons()
    restaurant_id = request.args.get('restaurant_id', type=int)

    query = Coupon.query.filter_by(is_active=True)
    if restaurant_id:
        from sqlalchemy import or_
        query = query.filter(or_(Coupon.restaurant_id.is_(None), Coupon.restaurant_id == restaurant_id))
    else:
        query = query.filter(Coupon.restaurant_id.is_(None))

    coupons = query.order_by(Coupon.created_at.desc()).all()
    now = datetime.now(timezone.utc)
    valid_coupons = [
        serialize_coupon(c) for c in coupons
        if (not c.expires_at or c.expires_at > now) and (not c.usage_limit or c.used_count < c.usage_limit)
    ]
    return jsonify(valid_coupons), 200


@coupon_bp.route('/validate', methods=['POST'])
@requires_auth()
def validate_coupon(payload):
    """التحقق من صلاحية كود الخصم وحساب قيمة الخصم بالليرة السورية الجديدة."""
    data = request.get_json() or {}
    code = (data.get('code') or '').strip().upper()
    subtotal = int(data.get('subtotal', 0))
    restaurant_id = data.get('restaurant_id')

    if not code:
        return jsonify({'message': 'يرجى إدخال كود الخصم'}), 400

    coupon = Coupon.query.filter(db.func.upper(Coupon.code) == code).first()
    if not coupon or not coupon.is_active:
        return jsonify({'message': 'كود الخصم غير صالح أو غير مفعل'}), 404

    if coupon.expires_at and coupon.expires_at <= datetime.now(timezone.utc):
        return jsonify({'message': 'انتهت صلاحية كود الخصم هذا'}), 400

    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        return jsonify({'message': 'تم استنفاد الحد الأقصى لاستخدام هذا الكوبون'}), 400

    if coupon.restaurant_id and restaurant_id and int(coupon.restaurant_id) != int(restaurant_id):
        return jsonify({'message': 'هذا الكوبون مخصص لمطعم آخر'}), 400

    if subtotal < coupon.min_order_amount:
        return jsonify({
            'message': f'الحد الأدنى للطلب لاستخدام هذا الكوبون هو {coupon.min_order_amount} ل.س'
        }), 400

    discount_amount = coupon.calculate_discount(subtotal)
    final_total = max(0, subtotal - discount_amount)

    return jsonify({
        'valid': True,
        'message': f'تم تطبيق الكوبون بنجاح! وفرت {discount_amount} ل.س 🎉',
        'coupon': serialize_coupon(coupon),
        'discount_amount': discount_amount,
        'final_total': final_total
    }), 200


# --- مسارات إدارة الكوبونات (للأدمن ومدير المطعم) ---

@coupon_bp.route('/', methods=['GET'])
@requires_auth(allowed_roles=['admin', 'manager', 'restaurant_manager', 'restaurant_admin'])
def list_all_coupons(payload):
    ensure_default_coupons()
    coupons = Coupon.query.order_by(Coupon.created_at.desc()).all()
    return jsonify([serialize_coupon(c) for c in coupons]), 200


@coupon_bp.route('/', methods=['POST'])
@requires_auth(allowed_roles=['admin', 'manager', 'restaurant_manager', 'restaurant_admin'])
def create_coupon(payload):
    data = request.get_json() or {}
    code = (data.get('code') or '').strip().upper()
    discount_type = data.get('discount_type', 'percentage')
    discount_value = int(data.get('discount_value', 0))
    min_order_amount = int(data.get('min_order_amount', 0))
    max_discount_amount = int(data['max_discount_amount']) if data.get('max_discount_amount') else None
    usage_limit = int(data['usage_limit']) if data.get('usage_limit') else None
    description = data.get('description', '')

    if not code or discount_value <= 0:
        return jsonify({'message': 'يرجى إدخال كود الخصم وقيمة خصم صحيحة'}), 400

    if Coupon.query.filter(db.func.upper(Coupon.code) == code).first():
        return jsonify({'message': 'كود الخصم هذا موجود مسبقاً'}), 400

    new_coupon = Coupon(
        code=code,
        description=description,
        discount_type=discount_type,
        discount_value=discount_value,
        min_order_amount=min_order_amount,
        max_discount_amount=max_discount_amount,
        usage_limit=usage_limit,
        is_active=True
    )
    db.session.add(new_coupon)
    db.session.commit()

    return jsonify({
        'message': 'تم إنشاء الكوبون بنجاح',
        'coupon': serialize_coupon(new_coupon)
    }), 201


@coupon_bp.route('/<int:coupon_id>/toggle', methods=['PUT'])
@requires_auth(allowed_roles=['admin', 'manager', 'restaurant_manager', 'restaurant_admin'])
def toggle_coupon(payload, coupon_id):
    coupon = Coupon.query.get_or_404(coupon_id)
    coupon.is_active = not coupon.is_active
    db.session.commit()
    return jsonify({
        'message': 'تم تحديث حالة الكوبون',
        'coupon': serialize_coupon(coupon)
    }), 200


@coupon_bp.route('/<int:coupon_id>', methods=['DELETE'])
@requires_auth(allowed_roles=['admin', 'manager'])
def delete_coupon(payload, coupon_id):
    coupon = Coupon.query.get_or_404(coupon_id)
    db.session.delete(coupon)
    db.session.commit()
    return jsonify({'message': 'تم حذف الكوبون بنجاح'}), 200
