import React from 'react';
import { motion } from 'framer-motion';
import type { Restaurant } from '../../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={cardVariants}
      className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300"
    >
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-800">{restaurant.name}</h3>
        <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>
      </div>
    </motion.div>
  );
};

export default RestaurantCard;