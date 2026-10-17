import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import type { Location } from '../../types';

interface LiveTrackingMapProps {
  restaurantName: string;
  restaurantLocation?: Location | null;
  deliveryAddress: string;
  deliveryLocation?: Location | null;
  courierLocation?: { lat: number; lon: number } | null;
  courierName?: string;
  courierPhone?: string | null;
  vehicleType?: string | null;
  orderStatus: string;
}

// حساب المسافة بالكيلومتر باستخدام معادلة Haversine
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// أيقونات مخصصة باستخدام DivIcon لتجنب مشاكل الصور الافتراضية وإعطاء مظهر عصري مثل تطبيقات التوصيل
const createCustomIcon = (emoji: string, bgColor: string, pulse = false) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
        ${
          pulse
            ? `<span style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: ${bgColor}; opacity: 0.45; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
            : ''
        }
        <div style="position: relative; z-index: 10; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9999px; background-color: ${bgColor}; color: white; font-size: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white;">
          ${emoji}
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -20],
  });

const restaurantIcon = createCustomIcon('🍽️', '#f59e0b'); // برتقالي للمطعم
const customerIcon = createCustomIcon('🏠', '#10b981');   // أخضر لمنزل العميل
const courierIcon = createCustomIcon('🛵', '#4f46e5', true); // بنفسجي نابض للمندوب

// مكون فرعي لتحريك الكاميرا بسلاسة عند تغير موقع المندوب
const MapAutoPan: React.FC<{ position: LatLngTuple | null; followCourier: boolean }> = ({
  position,
  followCourier,
}) => {
  const map = useMap();
  useEffect(() => {
    if (position && followCourier) {
      map.panTo(position, { animate: true, duration: 0.8 });
    }
  }, [position, followCourier, map]);
  return null;
};

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  restaurantName,
  restaurantLocation,
  deliveryAddress,
  deliveryLocation,
  courierLocation,
  courierName = 'مندوب التوصيل',
  courierPhone,
  vehicleType,
  orderStatus,
}) => {
  const [followCourier, setFollowCourier] = useState(true);
  const [simulatedLoc, setSimulatedLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // الإحداثيات الافتراضية (دمشق) في حال عدم توفر إحداثيات
  const defaultPoint: LatLngTuple = [33.5138, 36.2765];

  const customerPos: LatLngTuple = useMemo(() => {
    if (deliveryLocation) {
      return [deliveryLocation.latitude, deliveryLocation.longitude];
    }
    return defaultPoint;
  }, [deliveryLocation]);

  const restaurantPos: LatLngTuple = useMemo(() => {
    if (restaurantLocation) {
      return [restaurantLocation.latitude, restaurantLocation.longitude];
    }
    // إذا لم تتوفر إحداثيات المطعم، نضع نقطة افتراضية قريبة من العميل بمسافة ~1.5 كم
    return [customerPos[0] + 0.012, customerPos[1] - 0.015];
  }, [restaurantLocation, customerPos]);

  // موقع المندوب الفعلي (إما من WebSocket/الباكاند أو من المحاكاة التجريبية)
  const activeCourierLoc = simulatedLoc || courierLocation;

  const courierPos: LatLngTuple | null = useMemo(() => {
    if (activeCourierLoc) {
      return [activeCourierLoc.lat, activeCourierLoc.lon];
    }
    if (orderStatus === 'on_the_way' || orderStatus === 'picked_up') {
      // في حال كان الطلب في الطريق ولم يرسل المندوب إحداثياته بعد، يظهر عند نقطة الانطلاق (المطعم)
      return restaurantPos;
    }
    return null;
  }, [activeCourierLoc, orderStatus, restaurantPos]);

  // حساب المسافة المتبقية والوقت المتوقع للوصول (ETA)
  const { distanceKm, etaMinutes } = useMemo(() => {
    const startPoint = courierPos || restaurantPos;
    const dist = calculateDistanceKm(startPoint[0], startPoint[1], customerPos[0], customerPos[1]);
    // متوسط سرعة الدراجة داخل المدينة ~ 25 كم/ساعة + دقيقتين تسليم
    const minutes = Math.max(1, Math.round((dist / 25) * 60) + 2);
    return { distanceKm: dist, etaMinutes: minutes };
  }, [courierPos, restaurantPos, customerPos]);

  // محاكاة حركة المندوب على الخريطة للتجربة الحية
  useEffect(() => {
    if (!isSimulating) return;

    let step = 0;
    const totalSteps = 40;
    const startLat = restaurantPos[0];
    const startLon = restaurantPos[1];
    const endLat = customerPos[0];
    const endLon = customerPos[1];

    const interval = setInterval(() => {
      step += 1;
      if (step >= totalSteps) {
        setSimulatedLoc({ lat: endLat, lon: endLon });
        setIsSimulating(false);
        clearInterval(interval);
        return;
      }
      const progress = step / totalSteps;
      const currentLat = startLat + (endLat - startLat) * progress;
      const currentLon = startLon + (endLon - startLon) * progress;
      setSimulatedLoc({ lat: currentLat, lon: currentLon });
    }, 600);

    return () => clearInterval(interval);
  }, [isSimulating, restaurantPos, customerPos]);

  // مسار الخط المرسوم على الخريطة
  const routePositions: LatLngTuple[] = useMemo(() => {
    if (courierPos) {
      return [restaurantPos, courierPos, customerPos];
    }
    return [restaurantPos, customerPos];
  }, [restaurantPos, courierPos, customerPos]);

  return (
    <div className="my-6 bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden">
      {/* الشريط العلوي لمعلومات التتبع المباشر والوقت المتوقع */}
      <div className="bg-gradient-to-l from-indigo-600 to-purple-600 text-white p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-full text-2xl animate-bounce">
            🛵
          </div>
          <div>
            <h3 className="font-bold text-lg">
              {orderStatus === 'delivered'
                ? 'تم توصيل طلبك بنجاح! 🎉'
                : orderStatus === 'on_the_way' || isSimulating
                ? 'المندوب في الطريق إليك الآن'
                : 'مسار توصيل الطلب المباشر'}
            </h3>
            <p className="text-xs text-indigo-100 mt-0.5">
              من {restaurantName} إلى موقعك الحالي
            </p>
          </div>
        </div>

        {orderStatus !== 'delivered' && (
          <div className="flex items-center gap-4 bg-white/15 px-4 py-2 rounded-lg backdrop-blur-sm">
            <div className="text-center">
              <p className="text-xs text-indigo-100">الوقت المتوقع</p>
              <p className="font-extrabold text-lg">{etaMinutes} دقيقة</p>
            </div>
            <div className="h-8 w-px bg-white/25" />
            <div className="text-center">
              <p className="text-xs text-indigo-100">المسافة المتبقية</p>
              <p className="font-extrabold text-lg">
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)} م`
                  : `${distanceKm.toFixed(1)} كم`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* الخريطة التفاعلية */}
      <div className="relative h-80 w-full">
        <MapContainer
          center={courierPos || customerPos}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* خط مسار الرحلة */}
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: '#4f46e5',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.8,
            }}
          />

          {/* علامة المطعم */}
          <Marker position={restaurantPos} icon={restaurantIcon}>
            <Popup>
              <div className="text-right font-sans">
                <strong className="text-amber-600">🍽️ مطعم: {restaurantName}</strong>
                <p className="text-xs text-gray-600 mt-1">نقطة انطلاق الطلب</p>
              </div>
            </Popup>
          </Marker>

          {/* علامة منزل العميل */}
          <Marker position={customerPos} icon={customerIcon}>
            <Popup>
              <div className="text-right font-sans">
                <strong className="text-emerald-600">🏠 موقع التسليم</strong>
                <p className="text-xs text-gray-600 mt-1">{deliveryAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* علامة المندوب المتحركة */}
          {courierPos && (
            <Marker position={courierPos} icon={courierIcon}>
              <Popup>
                <div className="text-right font-sans">
                  <strong className="text-indigo-600">🛵 {courierName}</strong>
                  {vehicleType && <p className="text-xs text-gray-500">المركبة: {vehicleType}</p>}
                  {courierPhone && <p className="text-xs text-gray-500">هاتف: {courierPhone}</p>}
                </div>
              </Popup>
            </Marker>
          )}

          <MapAutoPan position={courierPos} followCourier={followCourier} />
        </MapContainer>

        {/* أزرار التحكم العائمة فوق الخريطة */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setFollowCourier((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition ${
                followCourier
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {followCourier ? '🎯 التتبع التلقائي مفعل' : '🎯 تفعيل التتبع التلقائي'}
            </button>

            <button
              type="button"
              onClick={() => {
                setSimulatedLoc({ lat: restaurantPos[0], lon: restaurantPos[1] });
                setIsSimulating(true);
              }}
              disabled={isSimulating}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition disabled:opacity-50"
            >
              {isSimulating ? '🛵 جاري محاكاة حركة المندوب...' : '▶️ محاكاة تحرك المندوب على الخريطة'}
            </button>
          </div>

          {/* وسيلة إيضاح الرموز (Legend) */}
          <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-md text-xs flex items-center gap-3 pointer-events-auto border border-gray-100">
            <span className="flex items-center gap-1">🍽️ المطعم</span>
            <span className="flex items-center gap-1">🛵 المندوب</span>
            <span className="flex items-center gap-1">🏠 موقعك</span>
          </div>
        </div>
      </div>

      {/* شريط بيانات المندوب في الأسفل إن وُجد */}
      {(courierName || courierPhone) && (
        <div className="p-3 bg-indigo-50/60 border-t border-indigo-100 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">المندوب المسؤول:</span>
            <span className="text-indigo-700 font-bold">{courierName}</span>
            {vehicleType && (
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                {vehicleType}
              </span>
            )}
          </div>
          {courierPhone && (
            <a
              href={`tel:${courierPhone}`}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1"
            >
              📞 اتصال بالمندوب
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveTrackingMap;
