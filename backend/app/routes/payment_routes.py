from flask import Blueprint, request, jsonify
from app.auth.auth import requires_auth
from app.models.order import Order
from app.models.payment import Payment
from app.extensions import db
from app.services.payment_service import PaymentGatewayFactory

payment_bp = Blueprint('payment_bp', __name__)

@payment_bp.route('/<int:order_id>/pay', methods=['POST'])
@requires_auth()
def initiate_payment(payload, order_id):
    """
    نقطة نهاية لبدء عملية الدفع لطلب معين.
    يتوقع أن يرسل الـ Frontend اسم البوابة (مثلاً: paymera, cash)
    """
    user_id = payload['id']
    data = request.get_json() or {}
    gateway_name = data.get('gateway_name', 'cash').lower()

    # جلب الطلب والتحقق من صلاحية المستخدم
    order = Order.query.get_or_404(order_id)
    if order.user_id != user_id:
        return jsonify({"message": "غير مصرح لك بدفع هذا الطلب"}), 403

    if order.status not in ['pending', 'accepted']:
        return jsonify({"message": "الطلب ليس في حالة تسمح بالدفع"}), 400

    # التأكد من عدم وجود دفع مسبق ناجح
    existing_payment = Payment.query.filter_by(order_id=order_id, status='completed').first()
    if existing_payment:
        return jsonify({"message": "هذا الطلب مدفوع بالفعل"}), 400

    try:
        # استخدام الـ Factory لإنشاء مزود الدفع المناسب
        provider = PaymentGatewayFactory.get_provider(gateway_name)
        
        # تهيئة الدفع مع البوابة
        result = provider.initiate_payment(order.id, order.total_price, "SYP")
        
        if not result.get("success"):
            return jsonify({"message": "فشل في تهيئة الدفع", "error": result}), 500

        # حفظ أو تحديث سجل الدفع في قاعدة البيانات
        payment = Payment.query.filter_by(order_id=order_id).first()
        if not payment:
            payment = Payment(
                order_id=order_id,
                amount=order.total_price,
                currency="SYP",
                payment_method=gateway_name,
                gateway_name=gateway_name,
                transaction_id=result.get("transaction_id"),
                payment_url=result.get("payment_url"),
                status='pending'
            )
            db.session.add(payment)
        else:
            payment.payment_method = gateway_name
            payment.gateway_name = gateway_name
            payment.transaction_id = result.get("transaction_id")
            payment.payment_url = result.get("payment_url")
            payment.status = 'pending'

        # إذا كانت الطريقة كاش، نؤكد الطلب مباشرة ونرسل إشعار للمطعم
        if gateway_name in ['cash', 'cod']:
            payment.status = 'completed'
            payment.order.status = 'preparing'
            db.session.flush() # لحفظ التعديل وجلب payment.order.restaurant_id
            
            from app.websocket import socketio
            socketio.emit('new_order', {
                'order_id': payment.order.id,
                'message': 'طلب جديد (دفع عند الاستلام)'
            }, room=f"restaurant_{payment.order.restaurant_id}")

        db.session.commit()

        return jsonify({
            "message": result.get("message"),
            "transaction_id": result.get("transaction_id"),
            "payment_url": result.get("payment_url") # سيقوم الفرونت إند بتوجيه المستخدم لهذا الرابط إن وُجد
        }), 200

    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "حدث خطأ غير متوقع", "error": str(e)}), 500


@payment_bp.route('/verify', methods=['POST', 'GET'])
def verify_payment():
    """
    نقطة النهاية (Callback URL) التي ستقوم بوابة الدفع (مثل بيميرا) بالتوجيه إليها 
    أو إرسال الـ Webhook لها بعد إتمام الدفع.
    """
    data = request.get_json() if request.is_json else request.args.to_dict()
    transaction_id = data.get('transaction_id')
    gateway_name = data.get('gateway_name', 'paymera') # افتراضياً، أو يمكن جلبه من الـ الرابط

    if not transaction_id:
        return jsonify({"message": "معرف العملية مفقود"}), 400

    payment = Payment.query.filter_by(transaction_id=transaction_id).first()
    if not payment:
        return jsonify({"message": "سجل الدفع غير موجود"}), 404

    try:
        provider = PaymentGatewayFactory.get_provider(gateway_name)
        is_successful, response_data = provider.verify_payment(transaction_id, data)

        payment.gateway_response = response_data
        
        if is_successful:
            payment.status = 'completed'
            payment.order.status = 'preparing'
            message = "تم تأكيد الدفع بنجاح"
            
            # إرسال تنبيه مباشر للمطعم
            from app.websocket import socketio
            socketio.emit('new_order', {
                'order_id': payment.order.id,
                'message': 'طلب جديد تم دفع قيمته'
            }, room=f"restaurant_{payment.order.restaurant_id}")

        else:
            payment.status = 'failed'
            message = "فشلت عملية الدفع"

        db.session.commit()
        return jsonify({"message": message, "status": payment.status}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "خطأ أثناء التحقق من الدفع", "error": str(e)}), 500
