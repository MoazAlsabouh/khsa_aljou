export interface Location {
  latitude: number;
  longitude: number;
}

export interface User {
  id: number;
  phone_number: string;
  email: string;
  name?: string;
  profile_image_url?: string;
  role: 'customer' | 'restaurant_admin' | 'restaurant_manager' | 'manager' | 'admin';
  is_active: boolean;
  is_banned: boolean;
  oauth_provider: string | null;
  phone_number_verified: boolean;
  associated_restaurant_id: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Restaurant {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
  address: string;
  status: 'active' | 'suspended';
  location: Location | null;
  delivery_area: Location[] | null;
  manager_id: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description: string;
  price: string;
  is_available: boolean;
  images?: string[]; // تم التصحيح هنا
  removable_ingredients?: string[];
}

export interface CartItem {
  id: number;
  cartItemId: string;
  name: string;
  price: string;
  quantity: number;
  images?: string[]; // تم التصحيح هنا
  removable_ingredients?: string[];
  excluded_ingredients: string[];
  notes: string;
}

export interface OrderItem {
  id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  price_at_order: string;
  excluded_ingredients?: string[];
  notes?: string;
  menu_item_image_url?: string;
  images?: string[];
}

export interface Payment {
  id: number;
  amount: string;
  payment_method: string;
  status: string;
  transaction_id: string | null;
  created_at: string;
}

export interface Rating {
  id: number;
  restaurant_rating: number;
  comment: string | null;
  created_at: string;
}

interface CustomerDetails {
    id: number;
    name: string;
    phone_number: string;
}

export interface Order {
  id: number;
  user_id: number;
  customer_details: CustomerDetails | null;
  restaurant_id: number;
  restaurant_name: string;
  status: string;
  total_price: string;
  delivery_address: string;
  delivery_location: Location | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  payment: Payment | null;
  rating: Rating | null;
}

export interface UserForAdmin {
    id: number;
    email: string;
    phone_number: string;
    role: string;
    is_banned: boolean;
    name?: string;
}

export interface RestaurantApplication {
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    restaurant_name: string;
    description: string;
    address: string;
    status: string;
    created_at: string;
    logo_url: string | null;
    location_lat: number;
    location_lon: number;
    delivery_area_geojson: any | null;
}

export interface UserAddress {
    id: number;
    user_id: number;
    name: string;
    address_line: string | null;
    location: Location;
    is_default: boolean;
}

export interface SalesDataPoint {
    date: string;
    sales: number;
}

export interface RestaurantStats {
    total_sales: number;
    total_orders: number;
    average_order_value: number;
    sales_over_time: SalesDataPoint[];
    period_info: {
        period: string;
        start_date: string;
        end_date: string;
    };
}