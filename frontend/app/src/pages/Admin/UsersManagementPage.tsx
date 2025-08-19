import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { UserForAdmin } from '../../types';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import useDebounce from '../../hooks/useDebounce'; // استيراد الخطاف الجديد

const ITEMS_PER_PAGE = 10;

const UsersManagementPage = () => {
  const [users, setUsers] = useState<UserForAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserForAdmin | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  
  // State for pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // استخدام useDebounce لتأخير البحث
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // تأخير 500ms

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearchTerm) { // استخدام القيمة المؤجلة
        params.append('search', debouncedSearchTerm);
      }
      if (roleFilter) {
        params.append('role', roleFilter);
      }

      const response = await axiosClient.get(`/admin/users?${params.toString()}`);
      setUsers(response.data.users);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('فشل في جلب قائمة المستخدمين.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, roleFilter]); // الاعتماد على القيمة المؤجلة

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  // إعادة التعيين للصفحة الأولى عند تغيير الفلاتر
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, roleFilter]);

  const handleOpenRoleModal = (user: UserForAdmin) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    const loadingToast = toast.loading('جارٍ تغيير الدور...');
    try {
      await axiosClient.put(`/admin/users/${selectedUser.id}/role`, { new_role: newRole });
      toast.dismiss(loadingToast);
      toast.success('تم تغيير دور المستخدم بنجاح.');
      fetchUsers();
      setIsRoleModalOpen(false);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'فشل تغيير الدور.');
    }
  };

  const handleBanToggle = async (user: UserForAdmin) => {
    const action = user.is_banned ? 'unban' : 'ban';
    const loadingToast = toast.loading(`جارٍ ${user.is_banned ? 'رفع الحظر عن' : 'حظر'} المستخدم...`);
    try {
      await axiosClient.post(`/admin/users/${user.id}/${action}`);
      toast.dismiss(loadingToast);
      toast.success(`تم ${user.is_banned ? 'رفع الحظر' : 'الحظر'} بنجاح.`);
      fetchUsers();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('فشلت العملية.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">إدارة المستخدمين</h1>
      
      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <Input 
          label="بحث بالاسم أو البريد" 
          placeholder="ابحث..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // تحديث مباشر
        />
        <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">تصفية حسب الدور</label>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">كل الأدوار</option>
              <option value="customer">Customer</option>
              <option value="restaurant_manager">Restaurant Manager</option>
              <option value="restaurant_admin">Restaurant Admin</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستخدم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name || user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {user.is_banned ? 'محظور' : 'نشط'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                  <button onClick={() => handleOpenRoleModal(user)} className="text-indigo-600 hover:text-indigo-900">تغيير الدور</button>
                  <button onClick={() => handleBanToggle(user)} className={user.is_banned ? "text-green-600 hover:text-green-900" : "text-red-600 hover:text-red-900"}>
                    {user.is_banned ? 'رفع الحظر' : 'حظر'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
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

      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={`تغيير دور ${selectedUser?.name || ''}`}>
        <div className="space-y-4">
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="customer">Customer</option>
            <option value="restaurant_manager">Restaurant Manager</option>
            <option value="restaurant_admin">Restaurant Admin</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <Button onClick={handleRoleChange}>حفظ التغيير</Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default UsersManagementPage;