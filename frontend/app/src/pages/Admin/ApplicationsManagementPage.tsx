import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { RestaurantApplication } from '../../types';
import Button from '../../components/common/Button';
import { useConfirmStore } from '../../store/confirmStore';
import ApplicationDetailsModal from '../../components/admin/ApplicationDetailsModal';

const ITEMS_PER_PAGE = 10;

const ApplicationsManagementPage = () => {
  const [applications, setApplications] = useState<RestaurantApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedApp, setSelectedApp] = useState<RestaurantApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showConfirm = useConfirmStore((state) => state.show);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(ITEMS_PER_PAGE),
      });
      const response = await axiosClient.get(`/admin/restaurant_applications?${params.toString()}`);
      setApplications(response.data.applications);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('فشل في جلب الطلبات.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = (appId: number) => {
    showConfirm(
      'هل أنت متأكد من الموافقة على هذا الطلب؟ سيتم إنشاء مطعم جديد وتغيير دور المستخدم.',
      async () => {
        const loadingToast = toast.loading('جارٍ قبول الطلب...');
        try {
          await axiosClient.put(`/admin/restaurant_applications/${appId}/approve`);
          toast.dismiss(loadingToast);
          toast.success('تم قبول الطلب بنجاح.');
          fetchApplications();
        } catch (error: any) {
          toast.dismiss(loadingToast);
          toast.error(error.response?.data?.message || 'فشلت العملية.');
        }
      }
    );
  };

  const handleReject = (appId: number) => {
    showConfirm(
      'هل أنت متأكد من رفض هذا الطلب؟',
      async () => {
        const loadingToast = toast.loading('جارٍ رفض الطلب...');
        try {
          await axiosClient.put(`/admin/restaurant_applications/${appId}/reject`);
          toast.dismiss(loadingToast);
          toast.success('تم رفض الطلب.');
          fetchApplications();
        } catch (error: any) {
          toast.dismiss(loadingToast);
          toast.error(error.response?.data?.message || 'فشلت العملية.');
        }
      }
    );
  };

  const handleViewDetails = (app: RestaurantApplication) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="text-center">جارٍ تحميل الطلبات...</div>;
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">طلبات انضمام المطاعم</h1>
        <div className="space-y-4">
          {applications.length > 0 ? (
            applications.map(app => (
              <div key={app.id} className="bg-white shadow rounded-lg p-4 transition-shadow hover:shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                  <div className="flex-grow cursor-pointer" onClick={() => handleViewDetails(app)}>
                    <div className="flex items-center gap-4">
                      {app.logo_url && (
                        <img src={app.logo_url} alt="Logo" className="h-12 w-12 rounded-md object-cover flex-shrink-0" />
                      )}
                      <div>
                        <h2 className="font-bold text-lg text-indigo-600">{app.restaurant_name}</h2>
                        <p className="text-sm text-gray-600">بواسطة: {app.user_name} ({app.user_email})</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 truncate">{app.description}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                    <Button onClick={() => handleApprove(app.id)} className="bg-green-600 hover:bg-green-700 w-auto px-4 py-1.5">قبول</Button>
                    <Button onClick={() => handleReject(app.id)} className="bg-red-600 hover:bg-red-700 w-auto px-4 py-1.5">رفض</Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 bg-white shadow rounded-lg p-6">
              لا توجد طلبات معلقة حالياً.
            </p>
          )}
        </div>
        
        {totalPages > 1 && (
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
        )}
      </motion.div>
      <ApplicationDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} application={selectedApp} />
    </>
  );
};

export default ApplicationsManagementPage;