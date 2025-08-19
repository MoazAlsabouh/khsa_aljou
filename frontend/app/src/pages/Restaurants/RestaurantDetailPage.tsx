import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient, { STATIC_FILES_URL } from '../../api/axiosClient';
import type { Restaurant, MenuItem } from '../../types';
import MenuItemCard from '../../components/restaurants/MenuItemCard';
import Cart from '../../components/cart/Cart';
import ItemCustomizationModal from '../../components/restaurants/ItemCustomizationModal';

const RestaurantDetailPage = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!restaurantId) return;
      setIsLoading(true);
      try {
        const [resDetails, resMenu] = await Promise.all([
          axiosClient.get(`/restaurants/${restaurantId}`),
          axiosClient.get(`/restaurants/${restaurantId}/menu`),
        ]);
        setRestaurant(resDetails.data);
        setMenu(resMenu.data);
      } catch (error) {
        toast.error('فشل في جلب تفاصيل المطعم.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [restaurantId]);
  
  const handleSelectItem = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsCustomizationModalOpen(true);
  };

  const getImageUrl = (url?: string | null): string | null => {
    if (!url) {
      return null;
    }
    if (url.startsWith('http')) {
      return url;
    }
    return `${STATIC_FILES_URL}/${url}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!restaurant) {
    return <p className="text-center">لم يتم العثور على المطعم.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6 flex flex-col sm:flex-row items-center gap-6"
          >
              <img 
                  src={getImageUrl(restaurant.logo_url) || 'https://placehold.co/150x150/EFEFEF/AAAAAA?text=Logo'} 
                  alt={`${restaurant.name} logo`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0"
              />
              <div className="text-center sm:text-right">
                  <h1 className="text-4xl font-extrabold text-gray-900">{restaurant.name}</h1>
                  <p className="text-md text-gray-500 mt-2">{restaurant.description}</p>
                  <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>
              </div>
          </motion.div>
          
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold">قائمة الطعام</h2>
            {menu.length > 0 ? (
              menu.map(item => <MenuItemCard key={item.id} item={item} onSelect={() => handleSelectItem(item)} />)
            ) : (
              <p className="bg-white p-4 rounded-lg shadow-sm text-center">لا توجد عناصر في القائمة حالياً.</p>
            )}
          </motion.div>
        </div>
        <div className="lg:col-span-1">
          <Cart />
        </div>
      </div>
      <ItemCustomizationModal 
        isOpen={isCustomizationModalOpen} 
        onClose={() => setIsCustomizationModalOpen(false)} 
        item={selectedMenuItem} 
      />
    </>
  );
};

export default RestaurantDetailPage;