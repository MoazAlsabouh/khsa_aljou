from collections import Counter
import math
from app.extensions import db
from app.models import Order, OrderItem, MenuItem, Restaurant
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, desc

class RecommendationEngine:
    """
    محرك التوصيات بالذكاء الاصطناعي (مبني على تحليل التكرار والمحتوى البسيط).
    """

    @staticmethod
    def get_user_taste_profile(user_id):
        """
        يحلل طلبات المستخدم السابقة لاستخراج "بروفايل الذوق" الخاص به.
        يعيد قائمة بالكلمات المفتاحية المفضلة وأكثر العناصر طلباً.
        """
        # جلب جميع عناصر الطلبات التي قام بها المستخدم (غير الملغاة)
        user_items = db.session.query(MenuItem).join(OrderItem).join(Order).filter(
            Order.user_id == user_id,
            Order.status != 'cancelled'
        ).all()

        if not user_items:
            return {"favorite_item_ids": [], "taste_keywords": []}

        item_counter = Counter([item.id for item in user_items])
        
        # استخراج الكلمات المفتاحية من أسماء ووصف الأطباق التي طلبها
        words = []
        for item in user_items:
            text = f"{item.name} {item.description or ''}".lower()
            tokens = [w for w in text.split() if len(w) >= 3]
            words.extend(tokens)
            
        keyword_counter = Counter(words)
        
        return {
            "favorite_item_ids": [item[0] for item in item_counter.most_common(5)],
            "taste_keywords": [word[0] for word in keyword_counter.most_common(10)]
        }

    @staticmethod
    def get_recommendations(user_id, lat, lon, radius_km=5):
        """
        يولد توصيات للمستخدم بناءً على موقعه وذوقه.
        """
        profile = RecommendationEngine.get_user_taste_profile(user_id)
        
        # 1. طلباتك السابقة (Order Again)
        order_again = []
        if profile["favorite_item_ids"]:
            order_again = MenuItem.query.filter(MenuItem.id.in_(profile["favorite_item_ids"]), MenuItem.is_available == True).limit(5).all()

        # نقطة موقع المستخدم
        user_point = WKTElement(f'POINT({lon} {lat})', srid=4326)

        # 2. مطاعم قريبة (Nearby Restaurants)
        nearby_restaurants_query = Restaurant.query.filter(
            func.ST_DistanceSphere(Restaurant.location, user_point) <= radius_km * 1000,
            Restaurant.status == 'active'
        )
        nearby_restaurant_ids = [r.id for r in nearby_restaurants_query.all()]

        # 3. بناءً على ذوقك (Based on your taste)
        # البحث عن أطباق في المطاعم القريبة تحتوي على الكلمات المفضلة للمستخدم
        taste_recommendations = []
        if profile["taste_keywords"] and nearby_restaurant_ids:
            # ننشئ استعلام للبحث عن الكلمات المفتاحية في الأسماء
            search_conditions = []
            for keyword in profile["taste_keywords"][:3]: # نأخذ أهم 3 كلمات
                search_conditions.append(MenuItem.name.ilike(f'%{keyword}%'))
            
            from sqlalchemy import or_
            if search_conditions:
                taste_recommendations = MenuItem.query.filter(
                    MenuItem.restaurant_id.in_(nearby_restaurant_ids),
                    MenuItem.is_available == True,
                    MenuItem.id.notin_(profile["favorite_item_ids"]), # لا تقترح ما طلبه سابقاً هنا
                    or_(*search_conditions)
                ).limit(5).all()

        # 4. الأكثر طلباً في منطقتك (Trending Near You)
        trending_items = []
        if nearby_restaurant_ids:
            trending_query = db.session.query(
                MenuItem, func.count(OrderItem.id).label('total_orders')
            ).join(OrderItem).filter(
                MenuItem.restaurant_id.in_(nearby_restaurant_ids),
                MenuItem.is_available == True
            ).group_by(MenuItem.id).order_by(desc('total_orders')).limit(5).all()
            
            trending_items = [item[0] for item in trending_query]

        return {
            "order_again": order_again,
            "based_on_taste": taste_recommendations,
            "trending_near_you": trending_items
        }
