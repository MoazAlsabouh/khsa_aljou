import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order } from '../../types';

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: number, newStatus: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusColors: { [key: string]: string } = {
    pending: 'bg-gray-200 text-gray-800',
    preparing: 'bg-blue-200 text-blue-800',
    out_for_delivery: 'bg-yellow-200 text-yellow-800',
    delivered: 'bg-green-200 text-green-800',
    cancelled: 'bg-red-200 text-red-800',
  };

  const statusOptions = [
    { value: 'pending', label: 'معلق' },
    { value: 'preparing', label: 'قيد التحضير' },
    { value: 'out_for_delivery', label: 'جاري التوصيل' },
    { value: 'delivered', label: 'تم التوصيل' },
    { value: 'cancelled', label: 'ملغي' },
  ];

  return (
    <motion.div layout className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex justify-between items-center">
          {/* Left Side: Price and Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <select
                  onChange={(e) => onStatusChange(order.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()} // منع توسيع البطاقة عند النقر على القائمة
                  defaultValue={order.status}
                  className="block w-full max-w-xs pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
            </div>
            <div className="text-left">
              <p className="font-bold">{order.total_price} ليرة</p>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status] || 'bg-gray-200'}`}>
                {order.status}
              </span>
            </div>
          </div>

          {/* Right Side: Order Info */}
          <div className="text-right">
            <p className="font-bold text-indigo-600">طلب رقم #{order.id}</p>
            <p className="text-sm text-gray-600">{order.customer_details?.name || 'زبون'}</p>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t p-4 space-y-4">
              <div>
                <h4 className="font-semibold">تفاصيل العميل:</h4>
                <p className="text-sm text-gray-600">العنوان: {order.delivery_address}</p>
                <p className="text-sm text-gray-600">الهاتف: {order.customer_details?.phone_number || 'غير متوفر'}</p>
              </div>
              <div>
                <h4 className="font-semibold">الطلبات:</h4>
                {order.order_items.map(item => (
                  <div key={item.id} className="text-sm text-gray-600 ml-2 mt-1">
                    <p>- {item.quantity} x {item.name}</p>
                    {item.excluded_ingredients && item.excluded_ingredients.length > 0 && (
                        <p className="text-xs text-red-500 mr-4">بدون: {item.excluded_ingredients.join(', ')}</p>
                    )}
                    {item.notes && (
                        <p className="text-xs text-blue-500 mr-4">ملاحظات: {item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OrderCard;