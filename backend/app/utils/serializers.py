from geoalchemy2.shape import to_shape
import os
from dotenv import load_dotenv

load_dotenv()

def serialize_user_address(address):
    location_data = None
    if address.location:
        point = to_shape(address.location)
        location_data = {'latitude': point.y, 'longitude': point.x}
    
    return {
        'id': address.id,
        'user_id': address.user_id,
        'name': address.name,
        'address_line': address.address_line,
        'location': location_data,
        'is_default': address.is_default,
        'created_at': address.created_at.isoformat() if address.created_at else None
    }

def serialize_user(user):
    profile_image = None
    if user.profile_image_url:
        if user.profile_image_url.startswith('http'):
            profile_image = user.profile_image_url
        else:
            backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
            profile_image = f"{backend_url}/static/uploads/{user.profile_image_url}"
    else:
        profile_image = 'https://placehold.co/400x400/EFEFEF/AAAAAA?text=User'

    return {
        'id': user.id,
        'phone_number': user.phone_number,
        'email': user.email,
        'name': user.name,
        'profile_image_url': profile_image,
        'role': user.role,
        'is_active': user.is_active,
        'is_banned': user.is_banned,
        'oauth_provider': user.oauth_provider,
        'phone_number_verified': user.phone_number_verified,
        'associated_restaurant_id': user.associated_restaurant_id,
        'addresses': [serialize_user_address(addr) for addr in user.addresses],
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'updated_at': user.updated_at.isoformat() if user.updated_at else None
    }

# جديد: دالة لتحويل بيانات العنوان إلى JSON
def serialize_user_address(address):
    location_data = None
    if address.location:
        point = to_shape(address.location)
        location_data = {'latitude': point.y, 'longitude': point.x}
    
    return {
        'id': address.id,
        'user_id': address.user_id,
        'name': address.name,
        'address_line': address.address_line,
        'location': location_data,
        'created_at': address.created_at.isoformat() if address.created_at else None
    }

def serialize_restaurant_application(application):
    logo_image = None
    if application.logo_url:
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
        logo_image = f"{backend_url}/static/uploads/{application.logo_url}"
    
    return {
        'id': application.id,
        'user_id': application.user_id,
        'user_name': application.user.name if application.user else 'N/A',
        'restaurant_name': application.restaurant_name,
        'description': application.description,
        'logo_url': logo_image,
        'address': application.address,
        'location_lat': application.location_lat,
        'location_lon': application.location_lon,
        'delivery_area_geojson': application.delivery_area_geojson,
        'status': application.status,
        'created_at': application.created_at.isoformat() if application.created_at else None
    }

def serialize_menu_item(menu_item):
    backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
    images = [f"{backend_url}/static/uploads/{img.image_url}" for img in menu_item.images]
    
    return {
        'id': menu_item.id,
        'restaurant_id': menu_item.restaurant_id,
        'name': menu_item.name,
        'description': menu_item.description,
        'price': str(menu_item.price),
        'is_available': menu_item.is_available,
        'images': images,
        'removable_ingredients': menu_item.removable_ingredients or [],
        'created_at': menu_item.created_at.isoformat() if menu_item.created_at else None
    }

def serialize_restaurant(restaurant):
    location_data = None
    if restaurant.location:
        point = to_shape(restaurant.location)
        location_data = {'latitude': point.y, 'longitude': point.x}

    delivery_area_data = None
    if restaurant.delivery_area:
        polygon = to_shape(restaurant.delivery_area)
        delivery_area_data = polygon.__geo_interface__

    logo_image = None
    if restaurant.logo_url:
        if restaurant.logo_url.startswith('http'):
            logo_image = restaurant.logo_url
        else:
            backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
            logo_image = f"{backend_url}/static/uploads/{restaurant.logo_url}"

    return {
        'id': restaurant.id,
        'name': restaurant.name,
        'description': restaurant.description,
        'logo_url': logo_image,
        'address': restaurant.address,
        'location': location_data,
        'delivery_area': delivery_area_data,
        'manager_id': restaurant.manager_id,
        'status': restaurant.status,
        'created_at': restaurant.created_at.isoformat() if restaurant.created_at else None,
        'menu_items': [serialize_menu_item(item) for item in restaurant.menu_items]
    }

def serialize_order_item(order_item):
    # تم التعديل: إضافة رابط الصورة
    menu_item_image_url = None
    if order_item.menu_item and order_item.menu_item.images:
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
        image_filename = order_item.menu_item.images[0].image_url
        menu_item_image_url = f"{backend_url}/static/uploads/{image_filename}"

    return {
        'id': order_item.id,
        'menu_item_id': order_item.menu_item_id,
        'name': order_item.menu_item.name if order_item.menu_item else None,
        'quantity': order_item.quantity,
        'price_at_order': str(order_item.price_at_order),
        'excluded_ingredients': order_item.excluded_ingredients or [],
        'notes': order_item.notes,
        'menu_item_image_url': menu_item_image_url # جديد: رابط الصورة
    }

def serialize_payment(payment):
    if not payment:
        return None
    return {
        'id': payment.id,
        'amount': str(payment.amount),
        'payment_method': payment.payment_method,
        'status': payment.status,
        'transaction_id': payment.transaction_id,
        'created_at': payment.created_at.isoformat() if payment.created_at else None
    }

def serialize_rating(rating):
    if not rating:
        return None
    return {
        'id': rating.id,
        'restaurant_rating': rating.restaurant_rating,
        'comment': rating.comment,
        'created_at': rating.created_at.isoformat() if rating.created_at else None
    }

def serialize_order(order):
    delivery_location_data = None
    if order.delivery_location:
        point = to_shape(order.delivery_location)
        delivery_location_data = {'latitude': point.y, 'longitude': point.x}

    customer_details = None
    if order.customer:
        customer_details = {
            'id': order.customer.id,
            'name': order.customer.name,
            'phone_number': order.customer.phone_number
        }

    return {
        'id': order.id,
        'user_id': order.user_id,
        'customer_details': customer_details,
        'restaurant_id': order.restaurant_id,
        'restaurant_name': order.restaurant_obj.name if order.restaurant_obj else None,
        'status': order.status,
        'total_price': str(order.total_price),
        'delivery_address': order.delivery_address,
        'delivery_location': delivery_location_data,
        'created_at': order.created_at.isoformat() if order.created_at else None,
        'updated_at': order.updated_at.isoformat() if order.updated_at else None,
        'order_items': [serialize_order_item(item) for item in order.order_items],
        'payment': serialize_payment(order.payment),
        'rating': serialize_rating(order.rating)
    }