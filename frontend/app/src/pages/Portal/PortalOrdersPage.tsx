import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { Order } from '../../types';
import OrderCard from '../../components/portal/OrderCard';
import NewOrderModal from '../../components/portal/NewOrderModal';
import { useNewOrderStore } from '../../store/newOrderStore';

const PortalOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const addOrdersToQueue = useNewOrderStore(state => state.addOrdersToQueue);

  const fetchOrders = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoading(true);
    try {
      const response = await axiosClient.get('/portal/orders');
      setOrders(response.data);
      const pendingOrders = response.data.filter((o: Order) => o.status === 'pending');
      addOrdersToQueue(pendingOrders);
    } catch (error) {
      toast.error('فشل في جلب الطلبات.');
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [addOrdersToQueue]);

  useEffect(() => {
    fetchOrders(true); // الجلب عند تحميل الصفحة مع عرض مؤشر التحميل
    const interval = setInterval(() => fetchOrders(false), 15000); // التحقق الدوري بدون مؤشر تحميل
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    const loadingToast = toast.loading('جارٍ تحديث الحالة...');
    try {
      await axiosClient.put(`/portal/orders/${orderId}/status`, { status: newStatus });
      toast.dismiss(loadingToast);
      toast.success('تم تحديث حالة الطلب بنجاح.');
      setOrders(prevOrders => 
        prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('فشل تحديث الحالة.');
    }
  };

  if (isLoading) {
    return <div className="text-center">جارٍ تحميل الطلبات...</div>;
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">إدارة الطلبات</h1>
        <div className="space-y-4">
          {orders.length > 0 ? (
              orders.map(order => (
                  <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
              ))
          ) : (
              <p className="text-center bg-white p-6 rounded-lg shadow">لا توجد طلبات حالياً.</p>
          )}
        </div>
      </motion.div>
      <NewOrderModal onOrderHandled={fetchOrders} />
    </>
  );
};

export default PortalOrdersPage;