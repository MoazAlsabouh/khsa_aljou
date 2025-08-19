import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNewOrderStore } from '../../store/newOrderStore';
import { useConfirmStore } from '../../store/confirmStore';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';

interface NewOrderModalProps {
  onOrderHandled: () => void;
}

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.error("Could not play sound:", e);
  }
};

const NewOrderModal: React.FC<NewOrderModalProps> = ({ onOrderHandled }) => {
  const { currentOrder, isModalOpen, closeModalAndProcessNext } = useNewOrderStore();
  const showConfirm = useConfirmStore(state => state.show);

  useEffect(() => {
    if (isModalOpen && currentOrder) {
      playNotificationSound();
    }
  }, [isModalOpen, currentOrder]);

  const handleStatusChange = async (status: 'preparing' | 'cancelled') => {
    if (!currentOrder) return;

    const loadingToast = toast.loading('جارٍ تحديث الحالة...');
    try {
      await axiosClient.put(`/portal/orders/${currentOrder.id}/status`, { status });
      toast.dismiss(loadingToast);
      toast.success(`تم ${status === 'preparing' ? 'قبول' : 'رفض'} الطلب.`);
      onOrderHandled();
      closeModalAndProcessNext();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('فشل تحديث الحالة.');
    }
  };

  const handleRejectClick = () => {
    showConfirm(
      'هل أنت متأكد من رفض هذا الطلب؟',
      () => handleStatusChange('cancelled')
    );
  };

  if (!currentOrder) return null;

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
          >
            <div className="p-4 border-b">
              <h2 className="text-2xl font-bold text-center text-indigo-600">طلب جديد!</h2>
              <p className="text-center text-gray-600">طلب رقم #{currentOrder.id}</p>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h4 className="font-semibold">تفاصيل العميل:</h4>
                <p>الاسم: {currentOrder.customer_details?.name}</p>
                <p>الهاتف: {currentOrder.customer_details?.phone_number}</p>
                <p>العنوان: {currentOrder.delivery_address}</p>
              </div>
              <div>
                <h4 className="font-semibold">الطلبات:</h4>
                {currentOrder.order_items.map(item => (
                  <div key={item.id} className="ml-2 mt-1">
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
              <div className="border-t pt-2 mt-4">
                <p className="font-bold text-lg text-right">الإجمالي: {currentOrder.total_price} ليرة</p>
              </div>
            </div>
            <div className="flex justify-center gap-4 p-4 bg-gray-50 rounded-b-lg mt-auto">
              <Button onClick={handleRejectClick} className="bg-red-600 hover:bg-red-700 w-full">
                رفض
              </Button>
              <Button onClick={() => handleStatusChange('preparing')} className="bg-green-600 hover:bg-green-700 w-full">
                قبول
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewOrderModal;