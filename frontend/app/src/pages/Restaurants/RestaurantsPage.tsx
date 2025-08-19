import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { Restaurant } from '../../types';
import RestaurantCard from '../../components/restaurants/RestaurantCard';
import AddressBar from '../../components/restaurants/AddressBar';
import { useAddressStore } from '../../store/addressStore';

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { selectedAddress, addresses, isLoading: isAddressLoading } = useAddressStore();

  const fetchRestaurants = useCallback(async () => {
    if (!selectedAddress) {
      setRestaurants([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const { latitude, longitude } = selectedAddress.location;
      const response = await axiosClient.get(`/restaurants/?lat=${latitude}&lon=${longitude}`);
      setRestaurants(response.data);
    } catch (error) {
      toast.error('فشل في جلب قائمة المطاعم.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAddress]);

  useEffect(() => {
    // جلب المطاعم فقط عندما يكون هناك عنوان مختار
    if (selectedAddress) {
      fetchRestaurants();
    }
  }, [selectedAddress, fetchRestaurants]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="space-y-6">
      <AddressBar />

      {!isAddressLoading && addresses.length > 0 && (
        <div>
          {isLoading ? (
            <div className="text-center py-10">جارٍ البحث عن المطاعم...</div>
          ) : restaurants.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {restaurants.map((restaurant) => (
                <Link to={`/restaurants/${restaurant.id}`} key={restaurant.id}>
                    <RestaurantCard restaurant={restaurant} />
                </Link>
              ))}
            </motion.div>
          ) : (
            <p className="text-center text-gray-500 bg-white shadow rounded-lg p-6">
              للأسف، لا توجد مطاعم توصل إلى هذا العنوان حالياً.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantsPage;