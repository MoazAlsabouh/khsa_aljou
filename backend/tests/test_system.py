import os
import sys
import uuid
import unittest
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# إضافة مجلد backend إلى مسار بايثون
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from app.extensions import db
from app.models import (
    User,
    Session,
    Restaurant,
    MenuItem,
    Order,
    OrderItem,
    Payment,
    Courier,
    Coupon,
)
from app.utils.token_utils import generate_token
from geoalchemy2.elements import WKTElement


class KhsaAljouInternalTestSuite(unittest.TestCase):
    """
    نظام الاختبارات الداخلي الشامل لمنصة (خسى الجوع).
    يختبر العملة السورية الجديدة، بوابات الدفع، الكوبونات، المناديب وتتبع الخرائط،
    محرك التوصيات الذكي، والتقارير المالية.
    """

    @classmethod
    def setUpClass(cls):
        cls.app = app
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()
        cls.app_context = cls.app.app_context()
        cls.app_context.push()

        # بادئة فريدة لبيانات الاختبار لتجنب أي تعارض وتنظيفها بالكامل بعد الانتهاء
        cls.test_tag = uuid.uuid4().hex[:6]
        cls.created_ids = {
            'users': [],
            'sessions': [],
            'restaurants': [],
            'menu_items': [],
            'orders': [],
            'coupons': [],
            'couriers': [],
        }

        cls._setup_test_actors()

    @classmethod
    def _create_authenticated_user(cls, role: str, name_prefix: str):
        user = User(
            name=f"{name_prefix}_{cls.test_tag}",
            email=f"{name_prefix}_{cls.test_tag}@test.sy",
            phone_number=f"09{uuid.uuid4().int % 100000000:08d}",
            role=role,
            is_active=True,
            phone_number_verified=True,
        )
        user.set_password("TestPass123!")
        db.session.add(user)
        db.session.flush()
        cls.created_ids['users'].append(user.id)

        session_id = uuid.uuid4()
        user_session = Session(
            id=session_id,
            user_id=user.id,
            refresh_token_jti=str(uuid.uuid4()),
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            session_version=1,
            revoked=False,
        )
        db.session.add(user_session)
        db.session.commit()
        cls.created_ids['sessions'].append(session_id)

        token = generate_token(user, session_id, 1)
        return user, token

    @classmethod
    def _setup_test_actors(cls):
        # 1. إنشاء مستخدم عميل، ومندوب، ومدير مطعم، وأدمن
        cls.customer, cls.customer_token = cls._create_authenticated_user('customer', 'cust')
        cls.courier_user, cls.courier_token = cls._create_authenticated_user('courier', 'cour')
        cls.manager_user, cls.manager_token = cls._create_authenticated_user('restaurant_manager', 'mgr')
        cls.admin_user, cls.admin_token = cls._create_authenticated_user('admin', 'adm')

        # 2. إنشاء مطعم تجريبي في دمشق مع نطاق توصيل يغطي دمشق
        polygon_wkt = 'POLYGON((36.20 33.45, 36.35 33.45, 36.35 33.58, 36.20 33.58, 36.20 33.45))'
        cls.restaurant = Restaurant(
            name=f"مطعم الشام التجريبي {cls.test_tag}",
            description="مطعم شاورما وبروستد سوري",
            address="دمشق - المزة",
            location=WKTElement('POINT(36.2765 33.5138)', srid=4326),
            delivery_area=WKTElement(polygon_wkt, srid=4326),
            manager_id=cls.manager_user.id,
            status='active',
        )
        db.session.add(cls.restaurant)
        db.session.flush()
        cls.created_ids['restaurants'].append(cls.restaurant.id)

        # مطعم ثانٍ قريب لاختبار محرك التوصيات الذكي (Based on Taste)
        cls.restaurant2 = Restaurant(
            name=f"مطعم ذوق الشام {cls.test_tag}",
            description="أشهى الوجبات السورية",
            address="دمشق - أبو رمانة",
            location=WKTElement('POINT(36.2800 33.5160)', srid=4326),
            delivery_area=WKTElement(polygon_wkt, srid=4326),
            manager_id=cls.manager_user.id,
            status='active',
        )
        db.session.add(cls.restaurant2)
        db.session.flush()
        cls.created_ids['restaurants'].append(cls.restaurant2.id)

        # 3. إضافة وجبات بالعملة السورية الجديدة (أعداد صحيحة بدون فواصل)
        cls.item1 = MenuItem(
            restaurant_id=cls.restaurant.id,
            name="شاورما دجاج عربي إكسترا",
            description="وجبة شاورما دجاج مع ثوم ومخلل",
            price=450,  # 450 ل.س بالعملة الجديدة
            is_available=True,
        )
        cls.item2 = MenuItem(
            restaurant_id=cls.restaurant2.id,
            name="شاورما دجاج فرنسي",
            description="شاورما دجاج مقرمشة مع جبنة",
            price=500,
            is_available=True,
        )
        db.session.add_all([cls.item1, cls.item2])
        db.session.commit()
        cls.created_ids['menu_items'].extend([cls.item1.id, cls.item2.id])

    @classmethod
    def tearDownClass(cls):
        """تنظيف جميع البيانات التجريبية التي أنشأها الاختبار من قاعدة البيانات."""
        try:
            for order_id in cls.created_ids['orders']:
                Payment.query.filter_by(order_id=order_id).delete()
                OrderItem.query.filter_by(order_id=order_id).delete()
                Order.query.filter_by(id=order_id).delete()

            for item_id in cls.created_ids['menu_items']:
                MenuItem.query.filter_by(id=item_id).delete()

            for rest_id in cls.created_ids['restaurants']:
                Restaurant.query.filter_by(id=rest_id).delete()

            for coupon_id in cls.created_ids['coupons']:
                Coupon.query.filter_by(id=coupon_id).delete()

            Courier.query.filter(Courier.user_id.in_(cls.created_ids['users'])).delete(synchronize_session=False)
            Session.query.filter(Session.user_id.in_(cls.created_ids['users'])).delete(synchronize_session=False)
            User.query.filter(User.id.in_(cls.created_ids['users'])).delete(synchronize_session=False)

            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Warning during test cleanup: {e}")
        finally:
            cls.app_context.pop()

    def _headers(self, token: str):
        return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    def test_01_syrian_currency_integer_models(self):
        """1. اختبار العملة السورية الجديدة (التأكد من أن الأسعار أعداد صحيحة Integer بدون قروش)."""
        fetched_item = MenuItem.query.get(self.item1.id)
        self.assertIsInstance(fetched_item.price, int)
        self.assertEqual(fetched_item.price, 450)

    def test_02_coupons_creation_and_validation(self):
        """2. اختبار نظام الكوبونات والعروض الترويجية (إنشاء الكوبون وحساب الخصم)."""
        coupon_code = f"TEST20_{self.test_tag}".upper()
        create_res = self.client.post(
            '/api/v1/coupons/',
            headers=self._headers(self.admin_token),
            json={
                'code': coupon_code,
                'description': 'خصم تجريبي 20%',
                'discount_type': 'percentage',
                'discount_value': 20,
                'min_order_amount': 300,
                'max_discount_amount': 250,
            },
        )
        self.assertEqual(create_res.status_code, 201)
        coupon_data = create_res.get_json()['coupon']
        self.created_ids['coupons'].append(coupon_data['id'])

        # التحقق من حساب الخصم على سلة بقيمة 900 ل.س -> الخصم 180 ل.س والصافي 720 ل.س
        val_res = self.client.post(
            '/api/v1/coupons/validate',
            headers=self._headers(self.customer_token),
            json={
                'code': coupon_code,
                'subtotal': 900,
                'restaurant_id': self.restaurant.id,
            },
        )
        self.assertEqual(val_res.status_code, 200)
        val_json = val_res.get_json()
        self.assertTrue(val_json['valid'])
        self.assertEqual(val_json['discount_amount'], 180)
        self.assertEqual(val_json['final_total'], 720)

    def test_03_order_creation_with_coupon_and_payment_gateways(self):
        """3. اختبار دورة الطلب الكاملة مع الكوبون وملاحظة الصرافة وبوابات الدفع (بيميرا وكاش)."""
        coupon_code = f"TEST20_{self.test_tag}".upper()

        # إنشاء طلب بوجبتين (2 * 450 = 900 ل.س) مع كود الخصم (خصم 180 -> الإجمالي 720 ل.س)
        order_res = self.client.post(
            '/api/v1/orders/',
            headers=self._headers(self.customer_token),
            json={
                'restaurant_id': self.restaurant.id,
                'items': [{'menu_item_id': self.item1.id, 'quantity': 2}],
                'delivery_address': 'دمشق - المالكي - شارع عبد المنعم رياض',
                'delivery_location': {'latitude': 33.5145, 'longitude': 36.2775},
                'payment_method': 'paymera',
                'coupon_code': coupon_code,
                'notes': 'الرجاء جلب صرافة لمبلغ: 1000 ل.س',
            },
        )
        self.assertEqual(order_res.status_code, 201)
        order_json = order_res.get_json()['order']
        order_id = order_json['id']
        self.__class__.test_order_id = order_id
        self.created_ids['orders'].append(order_id)

        self.assertEqual(int(order_json['total_price']), 720)
        self.assertEqual(order_json['discount_amount'], 180)
        self.assertEqual(order_json['coupon_code'], coupon_code)
        self.assertIn('1000 ل.س', order_json['notes'])

        # بدء الدفع عبر بوابة بيميرا (Paymera Adapter)
        pay_res = self.client.post(
            f'/api/v1/payments/{order_id}/pay',
            headers=self._headers(self.customer_token),
            json={'gateway_name': 'paymera'},
        )
        self.assertEqual(pay_res.status_code, 200)
        pay_data = pay_res.get_json()
        self.assertIsNotNone(pay_data.get('payment_url'))
        self.assertTrue(pay_data.get('transaction_id').startswith('paymera_tx_'))

        # التحقق من الدفع (Webhook / Callback)
        verify_res = self.client.post(
            '/api/v1/payments/verify',
            json={
                'transaction_id': pay_data['transaction_id'],
                'gateway_name': 'paymera',
            },
        )
        self.assertEqual(verify_res.status_code, 200)
        self.assertEqual(verify_res.get_json()['status'], 'completed')

        # التأكد من تحول حالة الطلب إلى preparing
        updated_order = Order.query.get(order_id)
        self.assertEqual(updated_order.status, 'preparing')

    def test_04_courier_portal_and_live_gps_tracking(self):
        """4. اختبار بوابة المندوب، استلام الطلب، وبث إحداثيات الـ GPS اللحظية."""
        order_id = getattr(self.__class__, 'test_order_id', None)
        self.assertIsNotNone(order_id)

        # 1. استعراض الطلبات المتاحة للمندوب
        avail_res = self.client.get(
            '/api/v1/couriers/orders/available',
            headers=self._headers(self.courier_token),
        )
        self.assertEqual(avail_res.status_code, 200)
        avail_ids = [o['id'] for o in avail_res.get_json()]
        self.assertIn(order_id, avail_ids)

        # 2. قبول واستلام الطلب من قبل المندوب
        accept_res = self.client.put(
            f'/api/v1/couriers/orders/{order_id}/accept',
            headers=self._headers(self.courier_token),
        )
        self.assertEqual(accept_res.status_code, 200)
        self.assertEqual(accept_res.get_json()['order']['status'], 'picked_up')

        # 3. تحديث حالة الطلب إلى "في الطريق" (on_the_way)
        status_res = self.client.put(
            f'/api/v1/couriers/orders/{order_id}/status',
            headers=self._headers(self.courier_token),
            json={'status': 'on_the_way'},
        )
        self.assertEqual(status_res.status_code, 200)

        # 4. بث إحداثيات المندوب الحية عبر الـ GPS
        loc_res = self.client.put(
            '/api/v1/couriers/location',
            headers=self._headers(self.courier_token),
            json={'lat': 33.5152, 'lon': 36.2781},
        )
        self.assertEqual(loc_res.status_code, 200)

        # 5. التحقق من ظهور إحداثيات المندوب وموقع المطعم في تفاصيل الطلب لدى العميل
        detail_res = self.client.get(
            f'/api/v1/orders/{order_id}',
            headers=self._headers(self.customer_token),
        )
        self.assertEqual(detail_res.status_code, 200)
        detail_json = detail_res.get_json()
        self.assertIsNotNone(detail_json.get('courier_details'))
        self.assertAlmostEqual(
            detail_json['courier_details']['current_location']['latitude'], 33.5152, places=4
        )
        self.assertIsNotNone(detail_json.get('restaurant_location'))

        # 6. إتمام توصيل الطلب (delivered)
        deliv_res = self.client.put(
            f'/api/v1/couriers/orders/{order_id}/status',
            headers=self._headers(self.courier_token),
            json={'status': 'delivered'},
        )
        self.assertEqual(deliv_res.status_code, 200)
        self.assertEqual(deliv_res.get_json()['order']['status'], 'delivered')

    def test_05_ai_recommendation_engine(self):
        """5. اختبار محرك التوصيات الذكي (تحليل ذوق العميل واقتراح وجبات مشابهة من مطاعم قريبة)."""
        rec_res = self.client.get(
            f'/api/v1/users/{self.customer.id}/recommendations?lat=33.5138&lon=36.2765',
            headers=self._headers(self.customer_token),
        )
        self.assertEqual(rec_res.status_code, 200)
        rec_data = rec_res.get_json()

        # يجب أن يظهر الطبق الأول في "اطلبها مجدداً" (order_again)
        order_again_ids = [item['id'] for item in rec_data['order_again']]
        self.assertIn(self.item1.id, order_again_ids)

        # ويجب أن يقترح محرك الذكاء الاصطناعي "شاورما دجاج فرنسي" من المطعم الثاني في "بناءً على ذوقك" (based_on_taste)
        taste_ids = [item['id'] for item in rec_data['based_on_taste']]
        self.assertIn(self.item2.id, taste_ids)

    def test_06_admin_financial_reports(self):
        """6. اختبار تقارير الأرباح المالية وعمولة المنصة (10%) في لوحة الأدمن."""
        rep_res = self.client.get(
            '/api/v1/admin/reports/financial',
            headers=self._headers(self.admin_token),
        )
        self.assertEqual(rep_res.status_code, 200)
        rep_data = rep_res.get_json()

        self.assertIn('summary', rep_data)
        self.assertGreaterEqual(rep_data['summary']['total_orders'], 1)
        self.assertGreaterEqual(rep_data['summary']['total_revenue'], 720)
        self.assertEqual(
            rep_data['summary']['platform_profit'],
            int(rep_data['summary']['total_revenue'] * 0.10),
        )


if __name__ == '__main__':
    print("=" * 70)
    print("🚀 بدء تشغيل نظام الاختبارات الداخلي الشامل لمنصة (خسى الجوع)...")
    print("=" * 70)
    unittest.main(verbosity=2)
