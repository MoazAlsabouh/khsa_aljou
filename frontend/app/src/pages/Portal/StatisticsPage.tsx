import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { RestaurantStats } from '../../types';
import StatCard from '../../components/portal/StatCard';
import SalesChart from '../../components/portal/SalesChart';
import Button from '../../components/common/Button';

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';

const StatisticsPage = () => {
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('weekly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchStats = async (fetchPeriod: Period, startDate?: string, endDate?: string) => {
    setIsLoading(true);
    try {
      let url = `/portal/statistics?period=${fetchPeriod}`;
      if (fetchPeriod === 'custom' && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const response = await axiosClient.get(url);
      setStats(response.data);
    } catch (error) {
      toast.error('فشل في جلب الإحصائيات.');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom') {
      fetchStats(period);
    }
  }, [period]);

  const handleFetchCustom = () => {
    if (!customStartDate || !customEndDate) {
      toast.error('يرجى تحديد تاريخ البداية والنهاية.');
      return;
    }
    fetchStats('custom', customStartDate, customEndDate);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إحصائيات الأداء</h1>
          {stats && (
            <p className="text-gray-500 mt-1">
              عرض بيانات من {formatDate(stats.period_info.start_date)} إلى {formatDate(stats.period_info.end_date)}
            </p>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-2 p-1 bg-gray-200 rounded-lg">
          {(['daily', 'weekly', 'monthly', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                period === p ? 'bg-white text-indigo-700 shadow' : 'text-gray-600 hover:bg-gray-300'
              }`}
            >
              {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : p === 'monthly' ? 'شهري' : 'مخصص'}
            </button>
          ))}
        </div>
      </div>
      
      {period === 'custom' && (
        <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row items-center gap-4"
        >
            <div className="w-full">
                <label className="text-sm font-medium">من تاريخ</label>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full mt-1 p-2 border rounded-md"/>
            </div>
            <div className="w-full">
                <label className="text-sm font-medium">إلى تاريخ</label>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full mt-1 p-2 border rounded-md"/>
            </div>
            <div className="w-full sm:w-auto pt-6">
                <Button onClick={handleFetchCustom} className="w-full">تطبيق</Button>
            </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="text-center py-10">جارٍ تحميل الإحصائيات...</div>
      ) : !stats ? (
        <div className="text-center py-10">لا توجد بيانات لعرضها.</div>
      ) : (
        <>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <StatCard title="إجمالي المبيعات" value={`${stats.total_sales.toFixed(2)} ريال`} description="مجموع المبيعات للفترة" />
            <StatCard title="إجمالي الطلبات" value={stats.total_orders} description="عدد الطلبات المكتملة" />
            <StatCard title="متوسط قيمة الطلب" value={`${stats.average_order_value.toFixed(2)} ريال`} description="متوسط قيمة كل طلب" />
          </motion.div>

          <SalesChart data={stats.sales_over_time} />
        </>
      )}
    </motion.div>
  );
};

export default StatisticsPage;