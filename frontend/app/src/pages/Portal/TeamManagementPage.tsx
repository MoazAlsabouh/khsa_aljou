import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { UserForAdmin } from '../../types';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const TeamManagementPage = () => {
  const [teamMembers, setTeamMembers] = useState<UserForAdmin[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<UserForAdmin | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const { user } = useAuthStore();

  const fetchTeamMembers = async () => {
    setIsLoadingTeam(true);
    try {
      const response = await axiosClient.get('/portal/team');
      setTeamMembers(response.data);
    } catch (error) {
      toast.error('فشل في جلب فريق العمل.');
    } finally {
      setIsLoadingTeam(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    setIsLoadingSearch(true);
    setSearchedUser(null);
    
    try {
      const response = await axiosClient.get(`/admin/users/search?q=${searchQuery}`);
      if (response.data.length > 0) {
        setSearchedUser(response.data[0]);
      } else {
        toast.error('لم يتم العثور على مستخدم بهذه البيانات.');
      }
    } catch (error) {
      toast.error('فشل في البحث عن المستخدم.');
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!searchedUser || !user?.associated_restaurant_id) return;

    setIsAddingAdmin(true);
    const loadingToast = toast.loading('جارٍ إضافة المشرف...');
    try {
      const response = await axiosClient.post(
        `/admin/restaurants/${user.associated_restaurant_id}/add_admin`,
        { user_id: searchedUser.id }
      );
      toast.dismiss(loadingToast);
      toast.success(response.data.message || 'تمت إضافة المشرف بنجاح.');
      setSearchedUser(null);
      setSearchQuery('');
      fetchTeamMembers(); // تحديث قائمة الفريق
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'فشلت عملية الإضافة.');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId: number) => {
    if (window.confirm('هل أنت متأكد من إزالة هذا المشرف من الفريق؟')) {
      const loadingToast = toast.loading('جارٍ إزالة المشرف...');
      try {
        await axiosClient.delete(`/portal/team/${adminId}`);
        toast.dismiss(loadingToast);
        toast.success('تمت إزالة المشرف بنجاح.');
        fetchTeamMembers(); // تحديث قائمة الفريق
      } catch (error: any) {
        toast.dismiss(loadingToast);
        toast.error(error.response?.data?.message || 'فشلت عملية الإزالة.');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">إدارة الفريق</h1>
      
      {/* قسم إضافة مشرف جديد */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">إضافة مشرف جديد</h2>
        <form onSubmit={handleSearch} className="flex items-start gap-2">
          <Input
            label="ابحث بالبريد الإلكتروني أو رقم الهاتف"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="example@example.com"
          />
          <div className="pt-7">
            <Button type="submit" isLoading={isLoadingSearch}>بحث</Button>
          </div>
        </form>

        {searchedUser && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 border rounded-lg bg-gray-50 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{searchedUser.name || 'لا يوجد اسم'}</p>
              <p className="text-sm text-gray-600">{searchedUser.email}</p>
            </div>
            <Button onClick={handleAddAdmin} isLoading={isAddingAdmin} className="w-auto">
              تعيين كمشرف
            </Button>
          </motion.div>
        )}
      </div>

      {/* قسم عرض فريق العمل الحالي */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">فريق العمل الحالي</h2>
        {isLoadingTeam ? (
          <p>جارٍ تحميل الفريق...</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {teamMembers.map(member => (
              <li key={member.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{member.name || 'لا يوجد اسم'}</p>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
                <button onClick={() => handleRemoveAdmin(member.id)} className="text-red-600 hover:text-red-800 font-medium">
                  إزالة
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
};

export default TeamManagementPage;