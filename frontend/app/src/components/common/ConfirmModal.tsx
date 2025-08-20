import { motion, AnimatePresence } from 'framer-motion';
import { useConfirmStore } from '../../store/confirmStore';
import Button from './Button';

const ConfirmModal = () => {
  const { isOpen, message, onConfirm, hide } = useConfirmStore();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    hide();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" // تم رفع z-index
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-gray-900">تأكيد الإجراء</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
            <div className="flex justify-center gap-4 p-4 bg-gray-50 rounded-b-lg">
              <Button onClick={hide} className="text-white bg-blue-600 hover:bg-blue-700 w-full">
                إلغاء
              </Button>
              <Button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700 w-full">
                تأكيد
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;