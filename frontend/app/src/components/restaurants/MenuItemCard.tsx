import React from 'react';
import { motion } from 'framer-motion';
import type { MenuItem } from '../../types';

interface MenuItemCardProps {
  item: MenuItem;
  onSelect: () => void; // دالة لفتح نافذة التخصيص
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onSelect }) => {
  const firstImage = item.images && item.images.length > 0 
    ? item.images[0] 
    : 'https://placehold.co/100x100/EFEFEF/AAAAAA?text=Food';

  return (
    <motion.button
      onClick={onSelect}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full flex items-center justify-between bg-white p-4 rounded-lg shadow-sm transition-shadow hover:shadow-md text-right"
    >
      <div className="flex-shrink-0 bg-indigo-100 text-indigo-700 font-bold p-3 rounded-full transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div className="flex-grow flex items-center gap-4 text-right">
        <div className="flex-grow">
          <h4 className="font-bold text-gray-800">{item.name}</h4>
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          <p className="font-semibold text-indigo-600 mt-2">{item.price} ليرة</p>
        </div>
        <img src={firstImage} alt={item.name} className="w-20 h-20 rounded-md object-cover flex-shrink-0" />
      </div>
    </motion.button>
  );
};

export default MenuItemCard;