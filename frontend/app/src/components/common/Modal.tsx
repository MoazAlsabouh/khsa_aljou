import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirmStore } from '../../store/confirmStore';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { y: "-50px", opacity: 0 },
    visible: { y: "0", opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    exit: { y: "50px", opacity: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex-shrink-0 flex justify-between items-center">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
