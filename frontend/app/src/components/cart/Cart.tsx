import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../store/cartStore';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';
import { useAddressStore } from '../../store/addressStore';

const Cart = () => {
  const { items, restaurantId, totalPrice, totalItems, updateQuantity, clearCart } = useCartStore();
  const { addresses, selectedAddress, setSelectedAddress } = useAddressStore();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress, setSelectedAddress]);

  const handleCheckout = async () => {
    if (!selectedAddress) {
      toast.error('الرجاء اختيار أو إضافة عنوان للتوصيل أولاً.');
      return;
    }

    setIsCheckingOut(true);
    const loadingToast = toast.loading('جارٍ إنشاء الطلب...');

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
    };

    try {
      const response = await axiosClient.post('/orders', orderData);
      toast.dismiss(loadingToast);
      toast.success('تم إنشاء طلبك بنجاح!');
      clearCart();
      navigate(`/orders/${response.data.order.id}`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'فشل في إنشاء الطلب.');
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
                      <p className="text-sm text-gray-500">{item.price} ليرة</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="font-bold">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="font-bold">+</button>
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
            
            <div className="space-y-2 mb-4">
                <h4 className="font-semibold">طريقة الدفع</h4>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="paymentMethod" value="cash_on_delivery" checked={paymentMethod === 'cash_on_delivery'} onChange={(e) => setPaymentMethod(e.target.value)} className="form-radio text-indigo-600"/>
                        <span>الدفع عند التوصيل</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="paymentMethod" value="digital_payment" checked={paymentMethod === 'digital_payment'} onChange={(e) => setPaymentMethod(e.target.value)} className="form-radio text-indigo-600"/>
                        <span>الدفع الرقمي</span>
                    </label>
                </div>
            </div>

            <div className="flex justify-between font-bold text-lg my-4">
              <span>الإجمالي</span>
              <span>{totalPrice().toFixed(2)} ليرة</span>
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