import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { Order } from '../../types';

const OrdersListPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await axiosClient.get('/orders/');
        setOrders(response.data);
      } catch (error) {
        toast.error('فشل في جلب قائمة الطلبات.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">طلباتي</h1>
      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.map(order => {
            const firstItemImage = order.order_items?.[0]?.menu_item_image_url || 'https://placehold.co/100x100/EFEFEF/AAAAAA?text=Order';
            return (
              <Link to={`/orders/${order.id}`} key={order.id} className="block bg-white shadow rounded-lg p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-4">
                  <img src={firstItemImage} alt={order.restaurant_name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                  <div className="flex-grow flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-indigo-600">{order.restaurant_name}</p>
                      <p className="text-sm text-gray-700">طلب رقم #{order.id}</p>
                      <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString('ar-SA')}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{order.total_price} ليرة</p>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <p className="text-center text-gray-500 bg-white shadow rounded-lg p-6">
            لا توجد لديك طلبات سابقة.
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default OrdersListPage;