import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { Order } from '../../types';
import Button from '../../components/common/Button';
import LiveTrackingMap from '../../components/orders/LiveTrackingMap';

interface CourierProfile {
  id: number;
  status: 'available' | 'busy' | 'offline';
  vehicle_type: string;
  vehicle_plate: string;
  current_location: { latitude: number; longitude: number } | null;
}

const CourierDashboardPage = () => {
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [vehicleType, setVehicleType] = useState('دراجة نارية');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const watchIdRef = useRef<number | null>(null);

  const fetchCourierData = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const [profileRes, availRes, activeRes] = await Promise.all([
        axiosClient.get('/couriers/profile'),
        axiosClient.get('/couriers/orders/available'),
        axiosClient.get('/couriers/orders/my-active'),
      ]);

      setProfile(profileRes.data);
      setVehicleType(profileRes.data.vehicle_type || 'دراجة نارية');
      setVehiclePlate(profileRes.data.vehicle_plate || '');
      if (profileRes.data.current_location) {
        setCurrentCoords({
          lat: profileRes.data.current_location.latitude,
          lon: profileRes.data.current_location.longitude,
        });
      }
      setAvailableOrders(availRes.data);
      setActiveOrders(activeRes.data);
    } catch (error) {
      toast.error('فشل في جلب بيانات بوابة المندوب.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourierData(true);
    const interval = setInterval(() => fetchCourierData(false), 12000);
    return () => clearInterval(interval);
  }, [fetchCourierData]);

  // إرسال إحداثيات المندوب إلى السيرفر (الذي يبثها عبر WebSockets للعميل)
  const sendLocationToServer = useCallback(async (lat: number, lon: number, silent = false) => {
    setCurrentCoords({ lat, lon });
    try {
      await axiosClient.put('/couriers/location', { lat, lon });
      if (!silent) {
        toast.success('تم تحديث موقعك وبثه للعميل بنجاح 📍');
      }
    } catch (err) {
      if (!silent) {
        toast.error('تعذر إرسال الموقع للسيرفر.');
      }
    }
  }, []);

  // تفعيل أو إيقاف البث الحي لموقع المندوب عبر GPS المتصفح/الهاتف
  const toggleGpsBroadcast = () => {
    if (isBroadcastingGps) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsBroadcastingGps(false);
      toast('تم إيقاف البث الحي للـ GPS', { icon: '⏹️' });
      return;
    }

    if (!navigator.geolocation) {
      toast.error('متصفحك لا يدعم تحديد الموقع الجغرافي GPS.');
      return;
    }

    setIsBroadcastingGps(true);
    toast.success('تم تفعيل البث الحي لموقعك عبر GPS! 📡');

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocationToServer(pos.coords.latitude, pos.coords.longitude, true);
      },
      () => {
        toast.error('تعذر قراءة الـ GPS، تأكد من منح صلاحية الموقع للمتصفح.');
        setIsBroadcastingGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    watchIdRef.current = id;
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // تحديث حالة التوفر أو بيانات المركبة
  const handleSaveProfile = async (newStatus?: string) => {
    try {
      const res = await axiosClient.post('/couriers/profile', {
        status: newStatus || profile?.status || 'available',
        vehicle_type: vehicleType,
        vehicle_plate: vehiclePlate,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              status: res.data.status,
              vehicle_type: res.data.vehicle_type,
              vehicle_plate: res.data.vehicle_plate,
            }
          : null
      );
      setIsEditingProfile(false);
      toast.success('تم حفظ إعدادات المندوب بنجاح');
    } catch (err) {
      toast.error('فشل في تحديث حالة المندوب');
    }
  };

  // قبول واستلام طلب
  const handleAcceptOrder = async (orderId: number) => {
    const loadingToast = toast.loading('جارٍ قبول الطلب...');
    try {
      await axiosClient.put(`/couriers/orders/${orderId}/accept`);
      toast.dismiss(loadingToast);
      toast.success('تم استلام الطلب بنجاح! راجع قسم طلباتك النشطة 🛵');
      fetchCourierData(false);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'فشل في قبول الطلب');
    }
  };

  // تحديث حالة الطلب (في الطريق / تم التوصيل)
  const handleUpdateOrderStatus = async (orderId: number, status: 'on_the_way' | 'delivered') => {
    const loadingToast = toast.loading('جارٍ تحديث حالة التوصيل...');
    try {
      await axiosClient.put(`/couriers/orders/${orderId}/status`, { status });
      toast.dismiss(loadingToast);
      toast.success(
        status === 'on_the_way'
          ? 'تم إشعار العميل بأنك في الطريق إليه! 🛵'
          : 'أحسنت! تم تأكيد تسليم الطلب بنجاح 🎉'
      );
      fetchCourierData(false);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'فشل تحديث حالة الطلب');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* ترويسة بوابة المندوب وأدوات التحكم بالـ GPS */}
      <div className="bg-gradient-to-l from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/15 p-3.5 rounded-2xl text-3xl">🛵</div>
            <div>
              <h1 className="text-2xl font-extrabold">بوابة المناديب والتوصيل السريع</h1>
              <p className="text-sm text-indigo-200 mt-1">
                المركبة: {profile?.vehicle_type || 'دراجة نارية'}{' '}
                {profile?.vehicle_plate ? `| اللوحة: ${profile.vehicle_plate}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* حالة التوفر */}
            <button
              type="button"
              onClick={() =>
                handleSaveProfile(profile?.status === 'offline' ? 'available' : 'offline')
              }
              className={`px-4 py-2 rounded-xl font-bold text-sm shadow transition flex items-center gap-2 ${
                profile?.status === 'available'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : profile?.status === 'busy'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-100'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
              {profile?.status === 'available'
                ? 'متاح لاستلام الطلبات'
                : profile?.status === 'busy'
                ? 'مشغول بتوصيل طلب'
                : 'غير متصل (اضغط للتفعيل)'}
            </button>

            {/* زر البث الحي للـ GPS */}
            <button
              type="button"
              onClick={toggleGpsBroadcast}
              className={`px-4 py-2 rounded-xl font-bold text-sm shadow transition flex items-center gap-2 ${
                isBroadcastingGps
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                  : 'bg-white text-indigo-900 hover:bg-indigo-50'
              }`}
            >
              {isBroadcastingGps ? '📡 إيقاف بث الـ GPS الحي' : '📡 تفعيل بث موقعي الحي (GPS)'}
            </button>

            <button
              type="button"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold transition"
            >
              ⚙️ إعدادات المركبة
            </button>
          </div>
        </div>

        {/* نموذج تعديل بيانات المركبة */}
        {isEditingProfile && (
          <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs text-indigo-200 mb-1">نوع المركبة</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-gray-900 text-sm"
              >
                <option value="دراجة نارية">دراجة نارية 🛵</option>
                <option value="دراجة هوائية">دراجة هوائية 🚲</option>
                <option value="سيارة">سيارة 🚗</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-indigo-200 mb-1">رقم اللوحة</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="مثال: دمشق 123456"
                className="w-full rounded-lg px-3 py-2 text-gray-900 text-sm"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => handleSaveProfile()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        )}
      </div>

      {/* القسم الأول: الطلبات النشطة المسندة للمندوب حالياً */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span>🔥</span> طلباتي النشطة قيد التوصيل ({activeOrders.length})
        </h2>

        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500 shadow-sm border border-gray-100">
            لا يوجد لديك طلبات قيد التوصيل حالياً. اختر طلباً من القائمة أدناه للبدء!
          </div>
        ) : (
          <div className="space-y-6">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-md border-2 border-indigo-500 p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                      طلب رقم #{order.id}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-2">
                      من مطعم: {order.restaurant_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      📍 عنوان العميل: <strong>{order.delivery_address}</strong>
                    </p>
                    {order.notes && (
                      <p className="text-sm text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg mt-2 border border-amber-200">
                        💡 <strong>ملاحظة / صرافة:</strong> {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-left">
                    <p className="text-sm text-gray-500">المبلغ المطلوب تحصيله</p>
                    <p className="text-2xl font-black text-emerald-600">
                      {parseInt(order.total_price, 10).toLocaleString('ar-SY')} ل.س
                    </p>
                    {order.customer_details?.phone_number && (
                      <a
                        href={`tel:${order.customer_details.phone_number}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold"
                      >
                        📞 اتصال بالعميل ({order.customer_details.name})
                      </a>
                    )}
                  </div>
                </div>

                {/* خريطة التوجيه المباشرة للمندوب */}
                <LiveTrackingMap
                  restaurantName={order.restaurant_name}
                  restaurantLocation={order.restaurant_location}
                  deliveryAddress={order.delivery_address}
                  deliveryLocation={order.delivery_location}
                  courierLocation={currentCoords}
                  courierName="موقعك الحالي"
                  vehicleType={profile?.vehicle_type}
                  orderStatus={order.status}
                />

                {/* أزرار تغيير الحالة للمندوب */}
                <div className="flex flex-wrap gap-4 pt-2">
                  {order.status === 'picked_up' && (
                    <Button
                      onClick={() => handleUpdateOrderStatus(order.id, 'on_the_way')}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      🛵 انطلقت نحو العميل (تحديث الحالة إلى: في الطريق)
                    </Button>
                  )}

                  <Button
                    onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    ✅ تم تسليم الطلب وتحصيل المبلغ بنجاح
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* القسم الثاني: الطلبات المتاحة للاستلام من المطاعم */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>📦</span> الطلبات المتاحة للتوصيل ({availableOrders.length})
          </h2>
          <button
            type="button"
            onClick={() => fetchCourierData(false)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            🔄 تحديث القائمة
          </button>
        </div>

        {availableOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
            لا توجد طلبات متاحة بانتظار مندوب في الوقت الحالي. ستظهر الطلبات هنا فور تجهيزها!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                      طلب #{order.id}
                    </span>
                    <span className="text-lg font-extrabold text-indigo-600">
                      {parseInt(order.total_price, 10).toLocaleString('ar-SY')} ل.س
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    🍽️ {order.restaurant_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    🏠 <strong>التوصيل إلى:</strong> {order.delivery_address}
                  </p>
                  {order.notes && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-3">
                      <strong>ملاحظة:</strong> {order.notes}
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleAcceptOrder(order.id)}
                  className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  🛵 قبول واستلام هذا الطلب
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CourierDashboardPage;
