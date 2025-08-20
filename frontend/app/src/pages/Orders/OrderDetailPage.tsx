import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { Order, Rating, OrderItem } from '../../types';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ratingSchema, type RatingFormInputs } from '../../schemas/authSchema';
import Button from '../../components/common/Button';
import ImageSlider from '../../components/common/ImageSlider';

const translatePaymentMethod = (method: string) => {
    const map: { [key: string]: string } = {
        'cash_on_delivery': 'الدفع عند التوصيل',
        'digital_payment': 'الدفع الرقمي'
    };
    return map[method] || method;
};

const translatePaymentStatus = (status: string) => {
    const map: { [key: string]: string } = {
        'pending': 'معلق',
        'paid': 'مدفوع',
        'failed': 'فشل'
    };
    return map[status] || status;
};

const OrderItemDetails: React.FC<{ item: OrderItem }> = ({ item }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
                <ImageSlider images={item.images || []} />
            </div>
            <div className="md:col-span-2">
                <h4 className="font-bold">{item.quantity} x {item.name}</h4>
                <p className="text-sm text-gray-600">السعر: {(item.quantity * parseFloat(item.price_at_order)).toFixed(2)} ليرة</p>
                {item.excluded_ingredients && item.excluded_ingredients.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">بدون: {item.excluded_ingredients.join(', ')}</p>
                )}
                {item.notes && (
                    <p className="text-xs text-blue-500 mt-1">ملاحظات: {item.notes}</p>
                )}
            </div>
        </div>
    </div>
  );
};

const RatingForm: React.FC<{ orderId: number; onRatingSuccess: (newRating: Rating) => void }> = ({ orderId, onRatingSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RatingFormInputs>({
    resolver: zodResolver(ratingSchema) as any, // <-- حيلة مؤقتة لتجاوز مشكلة النوع
    defaultValues: {
      restaurant_rating: 1,
      comment: '',
    },
  });

  const onSubmit: SubmitHandler<RatingFormInputs> = async (data) => {
    const loadingToast = toast.loading('جارٍ إرسال تقييمك...');
    try {
      const response = await axiosClient.post(`/orders/${orderId}/rate`, data);
      toast.dismiss(loadingToast);
      toast.success('شكراً لتقييمك!');
      onRatingSuccess(response.data.rating);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'فشل إرسال التقييم.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4 border-t pt-4">
      <div>
        <label htmlFor="restaurant_rating" className="block text-sm font-medium text-gray-700">
          تقييمك للمطعم (من 1 إلى 5)
        </label>
        <input
          id="restaurant_rating"
          type="number"
          min="1"
          max="5"
          className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
          {...register('restaurant_rating')}
        />
        {errors.restaurant_rating && <p className="mt-1 text-xs text-red-600">{errors.restaurant_rating.message}</p>}
      </div>
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
          تعليق (اختياري)
        </label>
        <textarea
          id="comment"
          rows={3}
          className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
          {...register('comment')}
        />
      </div>
      <Button type="submit" isLoading={isSubmitting}>إرسال التقييم</Button>
    </form>
  );
};

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      setIsLoading(true);
      try {
        const response = await axiosClient.get(`/orders/${orderId}`);
        setOrder(response.data);
      } catch (error) {
        toast.error('فشل في جلب تفاصيل الطلب.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!order) {
    return <p className="text-center">لم يتم العثور على الطلب.</p>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">تفاصيل الطلب رقم #{order.id}</h1>
            <p className="text-gray-500">من مطعم <Link to={`/restaurants/${order.restaurant_id}`} className="font-semibold text-indigo-600">{order.restaurant_name}</Link></p>
            <p className="text-sm text-gray-500 mt-1">{new Date(order.created_at).toLocaleString('ar-SA')}</p>
          </div>
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
            {order.status}
          </span>
        </div>

        <hr className="my-6" />

        <div>
          <h2 className="text-xl font-bold mb-4">الطلبات</h2>
          <div className="space-y-3">
            {order.order_items.map(item => (
              <OrderItemDetails key={item.id} item={item} />
            ))}
          </div>
        </div>

        <hr className="my-6" />

        <div className="space-y-2">
          <div className="flex justify-between font-semibold">
            <span>الإجمالي</span>
            <span>{order.total_price} ليرة</span>
          </div>
          <div className="flex justify-between">
            <span>طريقة الدفع</span>
            <span>{order.payment ? translatePaymentMethod(order.payment.payment_method) : 'غير محدد'}</span>
          </div>
          <div className="flex justify-between">
            <span>حالة الدفع</span>
            <span>{order.payment ? translatePaymentStatus(order.payment.status) : 'غير محدد'}</span>
          </div>
        </div>

        <hr className="my-6" />

        <div>
          <h2 className="text-xl font-bold mb-2">عنوان التوصيل</h2>
          <p className="text-gray-600">{order.delivery_address}</p>
        </div>
        
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">التقييم</h2>
          {order.status === 'delivered' && !order.rating && (
            <RatingForm orderId={order.id} onRatingSuccess={(newRating) => setOrder(prev => prev ? {...prev, rating: newRating} : null)} />
          )}
          {order.rating && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>تقييمك:</strong> {order.rating.restaurant_rating} من 5</p>
              {order.rating.comment && <p className="mt-2 text-gray-600"><strong>تعليقك:</strong> {order.rating.comment}</p>}
            </div>
          )}
          {order.status !== 'delivered' && (
            <p className="text-gray-500">يمكنك تقييم الطلب بعد توصيله.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default OrderDetailPage;