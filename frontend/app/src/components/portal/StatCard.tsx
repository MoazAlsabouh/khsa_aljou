import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description }) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={cardVariants} className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </motion.div>
  );
};

export default StatCard;