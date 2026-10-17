from abc import ABC, abstractmethod
import uuid
import time
from typing import Dict, Any, Tuple

class PaymentProvider(ABC):
    """
    الواجهة الأساسية (Interface) لجميع بوابات الدفع.
    """
    @abstractmethod
    def initiate_payment(self, order_id: int, amount: int, currency: str) -> Dict[str, Any]:
        """
        تهيئة عملية الدفع وإرجاع بيانات التوجيه (URL) للمستخدم.
        """
        pass

    @abstractmethod
    def verify_payment(self, transaction_id: str, request_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        التحقق من حالة الدفع بعد عودة المستخدم من بوابة الدفع.
        ترجع: (هل_نجح_الدفع, بيانات_الاستجابة)
        """
        pass


class PaymeraProvider(PaymentProvider):
    """
    مزود خدمة "بيميرا" (Paymera).
    هذا عبارة عن هيكل مبدئي (Mock) بانتظار وثائق الـ API الحقيقية.
    """
    def __init__(self, api_key: str, merchant_id: str):
        self.api_key = api_key
        self.merchant_id = merchant_id
        # سيتم إضافة base_url لـ API بيميرا هنا لاحقاً

    def initiate_payment(self, order_id: int, amount: int, currency: str) -> Dict[str, Any]:
        # TODO: إرسال طلب HTTP (POST) إلى خوادم بيميرا لإنشاء جلسة دفع باستخدام مكتبة requests أو httpx
        
        # محاكاة الاستجابة من بيميرا (Mock)
        transaction_id = f"paymera_tx_{uuid.uuid4().hex[:8]}"
        mock_payment_url = f"https://sandbox.paymera.sy/checkout?token={transaction_id}"
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "payment_url": mock_payment_url,
            "message": "تم تهيئة الدفع بنجاح عبر بيميرا"
        }

    def verify_payment(self, transaction_id: str, request_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        # TODO: إرسال طلب HTTP إلى بيميرا للتحقق من حالة العملية transaction_id
        
        # محاكاة الاستجابة
        is_successful = True # افتراض نجاح العملية في وضع الاختبار
        return is_successful, {
            "status": "completed" if is_successful else "failed",
            "transaction_id": transaction_id,
            "raw_data": request_data
        }


class CashOnDeliveryProvider(PaymentProvider):
    """
    الدفع عند الاستلام (COD) لا يتطلب توجيه، الدفع يتم يدوياً.
    """
    def initiate_payment(self, order_id: int, amount: int, currency: str) -> Dict[str, Any]:
        return {
            "success": True,
            "transaction_id": f"cod_{uuid.uuid4().hex[:8]}",
            "payment_url": None, # لا يوجد رابط توجيه
            "message": "تم اعتماد الدفع عند الاستلام"
        }

    def verify_payment(self, transaction_id: str, request_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        # الدفع عند الاستلام يتم التحقق منه من قبل المندوب، لذا نعتبره معلقاً أو ناجحاً برمجياً
        return True, {"status": "pending_delivery", "transaction_id": transaction_id}


class PaymentGatewayFactory:
    """
    مصنع (Factory) لإنشاء مزود الدفع المناسب بناءً على اسم البوابة المطلوبة.
    """
    @staticmethod
    def get_provider(gateway_name: str) -> PaymentProvider:
        if gateway_name.lower() == 'paymera':
            # يجب أن تجلب الـ Keys من ملف الـ Config أو .env
            return PaymeraProvider(api_key="MOCK_KEY", merchant_id="MOCK_MERCHANT")
        elif gateway_name.lower() in ['cash', 'cod']:
            return CashOnDeliveryProvider()
        else:
            raise ValueError(f"مزود خدمة الدفع {gateway_name} غير مدعوم حالياً.")
