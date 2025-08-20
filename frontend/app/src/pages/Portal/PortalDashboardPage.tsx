import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const PortalDashboardPage = () => {
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">لوحة تحكم المطعم</h1>
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div variants={cardVariants}>
          <Link to="/portal/orders" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-indigo-600">إدارة الطلبات</h2>
            <p className="mt-2 text-gray-600">عرض وتحديث حالة الطلبات الواردة.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/portal/menu" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-indigo-600">إدارة قائمة الطعام</h2>
            <p className="mt-2 text-gray-600">إضافة وتعديل وحذف وجبات من القائمة.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/portal/settings" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-indigo-600">إعدادات المطعم</h2>
            <p className="mt-2 text-gray-600">تحديث معلومات وبيانات المطعم.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/portal/team" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-indigo-600">إدارة الفريق</h2>
            <p className="mt-2 text-gray-600">إضافة مشرفين جدد لمطعمك.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/portal/statistics" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-indigo-600">الإحصائيات والتقارير</h2>
            <p className="mt-2 text-gray-600">عرض أداء مبيعات وطلبات المطعم.</p>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PortalDashboardPage;