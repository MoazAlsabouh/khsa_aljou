import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { UserForAdmin } from '../../types';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import useDebounce from '../../hooks/useDebounce';

const ITEMS_PER_PAGE = 10;

const ROLE_OPTIONS = [
  { value: 'customer', label: 'عميل (Customer)' },
  { value: 'courier', label: 'مندوب توصيل (Courier)' },
  { value: 'restaurant_manager', label: 'مدير مطعم (Restaurant Manager)' },
  { value: 'restaurant_admin', label: 'مشرف مطعم (Restaurant Admin)' },
  { value: 'manager', label: 'مدير نظام (Manager)' },
  { value: 'admin', label: 'مسؤول عام (Admin)' },
];

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">مسؤول عام (Admin)</span>;
    case 'manager':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">مدير نظام (Manager)</span>;
    case 'restaurant_manager':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">مدير مطعم (Rest. Manager)</span>;
    case 'restaurant_admin':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">مشرف مطعم (Rest. Admin)</span>;
    case 'courier':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">مندوب توصيل (Courier)</span>;
    case 'customer':
    default:
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">عميل (Customer)</span>;
  }
};

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
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearchTerm) {
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
  }, [currentPage, debouncedSearchTerm, roleFilter]);

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
      const response = await axiosClient.put(`/admin/users/${selectedUser.id}/role`, { new_role: newRole });
      toast.dismiss(loadingToast);
      toast.success(response.data?.message || 'تم تغيير دور المستخدم بنجاح.');
      
      // تحديث الحالة محلياً فوراً
      setUsers(prevUsers => prevUsers.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
      setIsRoleModalOpen(false);
      fetchUsers();
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
      setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? { ...u, is_banned: !user.is_banned } : u));
      fetchUsers();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'فشلت العملية.');
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        <span className="mr-3 text-gray-600 font-medium">جارٍ تحميل قائمة المستخدمين...</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">إدارة المستخدمين</h1>
      
      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:flex-1">
          <Input 
            label="بحث بالاسم أو البريد أو الهاتف" 
            placeholder="ابحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">تصفية حسب الدور</label>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            className="block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md shadow-sm"
          >
            <option value="">كل الأدوار</option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">المستخدم</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الدور الحالي</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                  لا يوجد مستخدمين يطابقون معايير البحث.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{user.name || 'بدون اسم'}</div>
                    <div className="text-xs text-gray-500 font-mono" dir="ltr">{user.email}</div>
                    {user.phone_number && (
                      <div className="text-xs text-gray-400 font-mono" dir="ltr">{user.phone_number}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {user.is_banned ? 'محظور' : 'نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3 space-x-reverse">
                    <button 
                      onClick={() => handleOpenRoleModal(user)} 
                      className="text-amber-600 hover:text-amber-900 font-semibold transition-colors"
                    >
                      تغيير الدور
                    </button>
                    <button 
                      onClick={() => handleBanToggle(user)} 
                      className={`font-semibold transition-colors ${user.is_banned ? "text-green-600 hover:text-green-900" : "text-red-600 hover:text-red-900"}`}
                    >
                      {user.is_banned ? 'رفع الحظر' : 'حظر'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between items-center">
        <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-1/4 sm:w-1/5">
          السابق
        </Button>
        <span className="text-sm text-gray-700">
          صفحة {currentPage} من {totalPages || 1}
        </span>
        <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="w-1/4 sm:w-1/5">
          التالي
        </Button>
      </div>

      {/* Change Role Modal */}
      <Modal 
        isOpen={isRoleModalOpen} 
        onClose={() => setIsRoleModalOpen(false)} 
        title={`تعديل دور: ${selectedUser?.name || selectedUser?.email || ''}`}
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
            <div><strong>المستخدم:</strong> {selectedUser?.name || 'غير محدد'}</div>
            <div className="font-mono text-xs text-gray-500 mt-1" dir="ltr">{selectedUser?.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اختر الدور الجديد</label>
            <select 
              value={newRole} 
              onChange={(e) => setNewRole(e.target.value)} 
              className="block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md shadow-sm"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsRoleModalOpen(false)} 
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              إلغاء
            </button>
            <button 
              type="button" 
              onClick={handleRoleChange} 
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none shadow-sm"
            >
              حفظ التغيير
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default UsersManagementPage;