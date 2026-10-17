import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useAddressStore } from '../../store/addressStore';
import MenuItemCard from '../restaurants/MenuItemCard';
import type { MenuItem } from '../../types';
import { motion } from 'framer-motion';

interface RecommendationData {
  order_again: MenuItem[];
  based_on_taste: MenuItem[];
  trending_near_you: MenuItem[];
}

const RecommendationSection = () => {
  const [recs, setRecs] = useState<RecommendationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore(state => state.user);
  const { selectedAddress } = useAddressStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !selectedAddress) return;

    const fetchRecs = async () => {
      setIsLoading(true);
      try {
        const { latitude, longitude } = selectedAddress.location;
        const res = await axiosClient.get(`/users/${user.id}/recommendations?lat=${latitude}&lon=${longitude}`);
        setRecs(res.data);
      } catch (err) {
        console.error('Failed to fetch recommendations', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecs();
  }, [user, selectedAddress]);

  if (isLoading) return <div className="text-center py-4 text-gray-500 animate-pulse">جاري إعداد ترشيحات الذكاء الاصطناعي... 🤖</div>;
  if (!recs) return null;

  const hasRecs = recs.order_again.length > 0 || recs.based_on_taste.length > 0 || recs.trending_near_you.length > 0;
  if (!hasRecs) return null;

  const renderSection = (title: string, items: MenuItem[], icon: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
          {items.map(item => (
            <div key={item.id} className="min-w-[280px] max-w-[280px] snap-center">
              <MenuItemCard item={item} onSelect={() => navigate(`/restaurants/${item.restaurant_id}`)} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm mb-8 border border-indigo-100">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-indigo-900">اخترنا لك بذكاء 💡</h1>
          <p className="text-sm text-indigo-600 mt-1">ترشيحات مخصصة لذوقك في منطقتك</p>
        </div>
      </div>
      
      {renderSection("اطلبها مجدداً", recs.order_again, "🔁")}
      {renderSection("بناءً على ذوقك", recs.based_on_taste, "🎯")}
      {renderSection("الأكثر طلباً حولك", recs.trending_near_you, "🔥")}
      
    </motion.div>
  );
};

export default RecommendationSection;
