import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../store/cartStore';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';
import { useAddressStore } from '../../store/addressStore';
import type { Coupon } from '../../types';

const Cart = () => {
  const { items, restaurantId, totalPrice, totalItems, updateQuantity, clearCart } = useCartStore();
  const { addresses, selectedAddress, setSelectedAddress } = useAddressStore();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [changeFor, setChangeFor] = useState('');

  // حالات الكوبونات والخصومات
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress, setSelectedAddress]);

  // جلب الكوبونات الفعالة المتاحة للمستخدم
  useEffect(() => {
    if (items.length === 0) return;
    const fetchActiveCoupons = async () => {
      try {
        const query = restaurantId ? `?restaurant_id=${restaurantId}` : '';
        const res = await axiosClient.get(`/coupons/active${query}`);
        setActiveCoupons(res.data || []);
      } catch (err) {
        // تجاهل الخطأ بصمت في حال عدم توفر كوبونات
      }
    };
    fetchActiveCoupons();
  }, [items.length, restaurantId]);

  const subtotal = Math.round(totalPrice());
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // إعادة حساب الخصم أو إلغاؤه إذا تغيرت محتويات السلة
  useEffect(() => {
    if (!appliedCoupon) {
      setDiscountAmount(0);
      return;
    }
    if (subtotal < appliedCoupon.min_order_amount) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      toast.error(`تم إلغاء الكوبون لأن المجموع أصبح أقل من ${appliedCoupon.min_order_amount} ل.س`);
      return;
    }
    if (appliedCoupon.discount_type === 'percentage') {
      let disc = Math.floor((subtotal * appliedCoupon.discount_value) / 100);
      if (appliedCoupon.max_discount_amount && disc > appliedCoupon.max_discount_amount) {
        disc = appliedCoupon.max_discount_amount;
      }
      setDiscountAmount(Math.min(disc, subtotal));
    } else {
      setDiscountAmount(Math.min(appliedCoupon.discount_value, subtotal));
    }
  }, [subtotal, appliedCoupon]);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const targetCode = (codeToApply ?? couponCode).trim().toUpperCase();
    if (!targetCode) {
      toast.error('يرجى إدخال كود الخصم أولاً');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const res = await axiosClient.post('/coupons/validate', {
        code: targetCode,
        subtotal,
        restaurant_id: restaurantId,
      });
      setCouponCode(targetCode);
      setAppliedCoupon(res.data.coupon);
      setDiscountAmount(res.data.discount_amount);
      toast.success(res.data.message || 'تم تطبيق كود الخصم بنجاح! 🎉');
    } catch (error: any) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      toast.error(error.response?.data?.message || 'كود الخصم غير صالح');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    toast('تم إزالة كود الخصم', { icon: 'ℹ️' });
  };

  const handleCheckout = async () => {
    if (!selectedAddress) {
      toast.error('الرجاء اختيار أو إضافة عنوان للتوصيل أولاً.');
      return;
    }

    setIsCheckingOut(true);
    const loadingToast = toast.loading('جارٍ إنشاء الطلب...');

    const finalNotes = changeFor && paymentMethod === 'cash' ? `الرجاء جلب صرافة لمبلغ: ${changeFor} ل.س` : '';

    const orderData = {
      restaurant_id: restaurantId,
      items: items.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        excluded_ingredients: item.excluded_ingredients,
        notes: item.notes,
      })),
      delivery_address: selectedAddress.address_line,
      delivery_location: {
        latitude: selectedAddress.location.latitude,
        longitude: selectedAddress.location.longitude
      },
      payment_method: paymentMethod,
      coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
      notes: finalNotes
    };

    try {
      // 1. إنشاء الطلب
      const response = await axiosClient.post('/orders', orderData);
      const orderId = response.data.order.id;

      toast.dismiss(loadingToast);

      // 2. تهيئة عملية الدفع
      toast.loading('جاري تجهيز الدفع...', { id: 'paymentToast' });
      const paymentRes = await axiosClient.post(`/payments/${orderId}/pay`, {
        gateway_name: paymentMethod
      });
      toast.dismiss('paymentToast');

      clearCart();
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponCode('');

      // التوجيه بناءً على طريقة الدفع
      if (paymentRes.data.payment_url) {
        window.location.href = paymentRes.data.payment_url;
      } else {
        toast.success('تم إنشاء طلبك بنجاح!');
        navigate(`/orders/${orderId}`);
      }

    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.dismiss('paymentToast');
      toast.error(error.response?.data?.message || 'فشل في إنشاء الطلب أو الدفع.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24">
      <h3 className="text-xl font-bold text-center mb-4">عربة التسوق</h3>
      <AnimatePresence>
        {items.length === 0 ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-500">
            عربة التسوق فارغة.
          </motion.p>
        ) : (
          <div>
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {items.map(item => (
                <motion.div
                  key={item.cartItemId}
                  className="pb-2 border-b last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-500">{parseInt(item.price, 10).toLocaleString('ar-SY')} ل.س</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="font-bold px-2 py-0.5 bg-gray-100 rounded">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="font-bold px-2 py-0.5 bg-gray-100 rounded">+</button>
                    </div>
                  </div>
                  {item.excluded_ingredients.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">بدون: {item.excluded_ingredients.join(', ')}</p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-blue-500 mt-1">ملاحظات: {item.notes}</p>
                  )}
                </motion.div>
              ))}
            </div>
            <hr className="my-4" />

            {/* قسم الكوبونات والعروض الترويجية على طريقة جيتير */}
            <div className="mb-4 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-900 mb-2">
                🎟️ كود الخصم أو العرض الترويجي
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded">
                      {appliedCoupon.code}
                    </span>
                    <p className="text-xs text-emerald-700 mt-1">
                      وفرت {discountAmount.toLocaleString('ar-SY')} ل.س على هذا الطلب!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-600 hover:text-red-800 font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="أدخل الكود (مثال: SHAM20)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 p-2 text-sm border rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      disabled={isApplyingCoupon}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-50"
                    >
                      {isApplyingCoupon ? '...' : 'تطبيق'}
                    </button>
                  </div>

                  {/* عرض الكوبونات المتاحة للضغط السريع */}
                  {activeCoupons.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {activeCoupons.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className="text-[11px] bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-md font-semibold transition flex items-center gap-1"
                          title={c.description || ''}
                        >
                          <span>🎁 {c.code}</span>
                          <span className="text-gray-500">
                            ({c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value} ل.س`})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <h4 className="font-semibold">طريقة الدفع</h4>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={(e) => setPaymentMethod(e.target.value)} className="form-radio text-indigo-600"/>
                  <span>الدفع عند الاستلام</span>
                </label>
                {paymentMethod === 'cash' && (
                  <div className="mr-6">
                    <input
                      type="number"
                      placeholder="مبلغ الباقي (اختياري، لتسهيل الصرافة)"
                      className="w-full p-2 text-sm border rounded-md"
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value)}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paymentMethod" value="paymera" checked={paymentMethod === 'paymera'} onChange={(e) => setPaymentMethod(e.target.value)} className="form-radio text-indigo-600"/>
                  <span>الدفع مباشر (بطاقة / بيميرا)</span>
                </label>
              </div>
            </div>

            {/* تفاصيل الفاتورة قبل وبعد الخصم */}
            <div className="space-y-1.5 my-4 border-t pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي</span>
                <span>{subtotal.toLocaleString('ar-SY')} ل.س</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>خصم الكوبون ({appliedCoupon?.code})</span>
                  <span>- {discountAmount.toLocaleString('ar-SY')} ل.س</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-1">
                <span>الإجمالي النهائي</span>
                <span>{finalTotal.toLocaleString('ar-SY')} ل.س</span>
              </div>
            </div>

            <Button onClick={handleCheckout} isLoading={isCheckingOut} disabled={addresses.length === 0}>
              إتمام الطلب ({totalItems()})
            </Button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cart;