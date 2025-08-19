import React, { useState, useEffect } from 'react';
import type { MenuItem } from '../../types';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useCartStore } from '../../store/cartStore';
import { motion, AnimatePresence } from 'framer-motion';

interface ItemCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({ isOpen, onClose, item }) => {
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    if (item) {
      setExcludedIngredients([]);
      setNotes('');
      setCurrentIndex(0);
    }
  }, [item]);

  if (!item) return null;

  const handleIngredientToggle = (ingredient: string) => {
    setExcludedIngredients(prev => 
      prev.includes(ingredient) 
        ? prev.filter(i => i !== ingredient) 
        : [...prev, ingredient]
    );
  };

  const handleAddToCart = () => {
    addItem(item, item.restaurant_id, { excluded_ingredients: excludedIngredients, notes });
    onClose();
  };

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? (item.images?.length || 1) - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === (item.images?.length || 1) - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name}>
      <div className="space-y-4">
        {/* Image Slider */}
        <div className="h-48 w-full relative overflow-hidden rounded-lg bg-gray-200">
          <AnimatePresence initial={false}>
            <motion.img
              key={currentIndex}
              src={(item.images && item.images[currentIndex]) || 'https://placehold.co/400x200/EFEFEF/AAAAAA?text=Food'}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full object-cover absolute"
            />
          </AnimatePresence>
          {item.images && item.images.length > 1 && (
            <>
              <div className="absolute top-1/2 -translate-y-1/2 left-2 cursor-pointer bg-black bg-opacity-30 text-white rounded-full p-1" onClick={goToPrevious}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 right-2 cursor-pointer bg-black bg-opacity-30 text-white rounded-full p-1" onClick={goToNext}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </>
          )}
        </div>
        
        <div>
            <p className="text-lg font-bold text-indigo-600">{item.price} ليرة</p>
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
        </div>

        {item.removable_ingredients && item.removable_ingredients.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">إزالة مكونات:</h4>
            <div className="flex flex-wrap gap-2">
              {item.removable_ingredients.map(ingredient => (
                <button
                  key={ingredient}
                  onClick={() => handleIngredientToggle(ingredient)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    excludedIngredients.includes(ingredient)
                      ? 'bg-red-500 text-white line-through'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {ingredient}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            ملاحظات إضافية
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="...مثال:مايونيز زيادة أو بدون خبز"
          />
        </div>
        <Button onClick={handleAddToCart}>إضافة إلى العربة</Button>
      </div>
    </Modal>
  );
};

export default ItemCustomizationModal;