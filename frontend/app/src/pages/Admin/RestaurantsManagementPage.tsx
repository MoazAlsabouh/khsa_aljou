import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { Restaurant } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import useDebounce from '../../hooks/useDebounce';
import { useConfirmStore } from '../../store/confirmStore';

const ITEMS_PER_PAGE = 10;

const RestaurantsManagementPage = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'active', 'suspended', or '' for all
  const showConfirm = useConfirmStore((state) => state.show);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);

      const response = await axiosClient.get(`/admin/restaurants?${params.toString()}`);
      setRestaurants(response.data.restaurants);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('فشل في جلب قائمة المطاعم.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  const handleStatusToggle = async (restaurant: Restaurant) => {
    const action = restaurant.status === 'suspended' ? 'unsuspend' : 'suspend';
    const loadingToast = toast.loading('جارٍ تحديث الحالة...');
    
    try {
      if (action === 'suspend') {
        await axiosClient.delete(`/admin/restaurants/${restaurant.id}`);
      } else {
        await axiosClient.post(`/admin/restaurants/${restaurant.id}/unsuspend`);
      }
      toast.dismiss(loadingToast);
      toast.success('تم تحديث الحالة بنجاح!');
      
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(res => 
          res.id === restaurant.id 
            ? { ...res, status: action === 'suspend' ? 'suspended' : 'active' } 
            : res
        )
      );

    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'فشل تحديث الحالة.');
    }
  };

  const handleForceDelete = (restaurantId: number) => {
    showConfirm(
      'تحذير: هذا الإجراء سيحذف المطعم نهائياً وكل بياناته المرتبطة به. هل أنت متأكد؟',
      async () => {
        const loadingToast = toast.loading('جارٍ الحذف النهائي...');
        try {
          await axiosClient.post(`/admin/restaurants/${restaurantId}/force-delete`);
          toast.dismiss(loadingToast);
          toast.success('تم حذف المطعم نهائياً.');
          fetchRestaurants();
        } catch (error: any) {
          toast.dismiss(loadingToast);
          toast.error(error.response?.data?.message || 'فشل الحذف النهائي.');
        }
      }
    );
  };

  if (isLoading) {
    return <div className="text-center">جارٍ تحميل المطاعم...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">إدارة المطاعم</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <Input 
          label="بحث بالاسم أو العنوان" 
          placeholder="ابحث..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <div className="w-full">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">فرز حسب الحالة</label>
            <select 
              id="status-filter"
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">الكل</option>
              <option value="active">نشط</option>
              <option value="suspended">معلق</option>
            </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المطعم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العنوان</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {restaurants.map(res => (
              <tr key={res.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{res.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{res.address}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${res.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {res.status === 'suspended' ? 'معلق' : 'نشط'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                  <button onClick={() => handleStatusToggle(res)} className={res.status === 'suspended' ? "text-green-600 hover:text-green-900" : "text-yellow-600 hover:text-yellow-900"}>
                    {res.status === 'suspended' ? 'إعادة تفعيل' : 'تعليق'}
                  </button>
                  <button onClick={() => handleForceDelete(res.id)} className="text-red-600 hover:text-red-900">
                    حذف نهائي
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-1/4 sm:w-1/5">
          السابق
        </Button>
        <span className="text-sm text-gray-700">
          صفحة {currentPage} من {totalPages}
        </span>
        <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-1/4 sm:w-1/5">
          التالي
        </Button>
      </div>
    </motion.div>
  );
};

export default RestaurantsManagementPage;