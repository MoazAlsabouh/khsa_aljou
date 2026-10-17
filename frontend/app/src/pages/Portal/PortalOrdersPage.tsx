import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { Order } from '../../types';
import OrderCard from '../../components/portal/OrderCard';
import NewOrderModal from '../../components/portal/NewOrderModal';
import { useNewOrderStore } from '../../store/newOrderStore';
import { useAuthStore } from '../../store/authStore';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '../../api/axiosClient';

const PortalOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const addOrdersToQueue = useNewOrderStore(state => state.addOrdersToQueue);
  const user = useAuthStore(state => state.user);

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
    fetchOrders(true);
    
    // إعداد الـ WebSocket
    let socket: Socket;
    if (user?.associated_restaurant_id) {
      socket = io(BACKEND_URL);
      
      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        socket.emit('join_restaurant_room', { restaurant_id: user.associated_restaurant_id });
      });

      socket.on('new_order', (data) => {
        toast.success(data.message || 'طلب جديد وصل!', { icon: '🔔', duration: 5000 });
        // تشغيل صوت تنبيه
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.error("Audio play failed:", e));
        
        fetchOrders(false); // إعادة جلب الطلبات
      });
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchOrders, user?.associated_restaurant_id]);

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