import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axiosClient from '../../api/axiosClient';

interface FinancialReport {
  summary: {
    total_orders: number;
    total_revenue: number;
    platform_profit: number;
    commission_rate: string;
  };
  top_restaurants: {
    restaurant_name: string;
    orders_count: number;
    revenue: number;
    platform_fee: number;
  }[];
}

const AdminDashboardPage = () => {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await axiosClient.get('/admin/reports/financial');
        setReport(res.data);
      } catch (err) {
        console.error("Failed to fetch financial reports", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">لوحة تحكم الأدمن والإدارة العامة</h1>
      
      {isLoading ? (
        <div className="text-center py-10 animate-pulse text-indigo-500">جاري تحميل التقارير المالية...</div>
      ) : report ? (
        <div className="mb-10">
            {/* بطاقات الإحصائيات المالية */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-indigo-500">
                    <p className="text-sm text-gray-500 mb-1">إجمالي المبيعات (GMV)</p>
                    <p className="text-3xl font-bold text-gray-800">{report.summary.total_revenue.toLocaleString('ar-SY')} <span className="text-sm font-normal">ل.س</span></p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-green-500">
                    <p className="text-sm text-gray-500 mb-1">أرباح المنصة ({report.summary.commission_rate})</p>
                    <p className="text-3xl font-bold text-green-600">{report.summary.platform_profit.toLocaleString('ar-SY')} <span className="text-sm font-normal">ل.س</span></p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-blue-500">
                    <p className="text-sm text-gray-500 mb-1">إجمالي الطلبات المكتملة</p>
                    <p className="text-3xl font-bold text-blue-600">{report.summary.total_orders.toLocaleString('ar-SY')}</p>
                </div>
            </div>

            {/* رسم بياني لأفضل المطاعم */}
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6">أفضل المطاعم مبيعاً</h2>
                {report.top_restaurants.length > 0 ? (
                  <div className="h-[300px] w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={report.top_restaurants} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="restaurant_name" />
                              <YAxis />
                              <Tooltip formatter={(value: number) => value.toLocaleString('ar-SY') + ' ل.س'} />
                              <Bar dataKey="revenue" name="المبيعات" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">لا توجد بيانات كافية لعرض الرسم البياني.</p>
                )}
            </div>
        </div>
      ) : null}

      <h2 className="text-2xl font-bold text-gray-900 mb-6">إدارة النظام</h2>
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div variants={cardVariants}>
          <Link to="/admin/users" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-100">
            <h2 className="text-xl font-bold text-indigo-600">إدارة المستخدمين</h2>
            <p className="mt-2 text-gray-600">عرض وتعديل أدوار وحالة المستخدمين.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/admin/applications" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-100">
            <h2 className="text-xl font-bold text-indigo-600">إدارة طلبات المطاعم</h2>
            <p className="mt-2 text-gray-600">مراجعة وقبول أو رفض طلبات الانضمام.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/admin/restaurants" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-100">
            <h2 className="text-xl font-bold text-indigo-600">إدارة المطاعم</h2>
            <p className="mt-2 text-gray-600">تعليق، تفعيل، أو حذف المطاعم.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/admin/coupons" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-indigo-200 bg-indigo-50/30">
            <h2 className="text-xl font-bold text-indigo-600">🎟️ إدارة الكوبونات والعروض</h2>
            <p className="mt-2 text-gray-600">إنشاء وتفعيل أكواد الخصم والعروض الترويجية.</p>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminDashboardPage;