import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const AdminDashboardPage = () => {
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">لوحة تحكم الأدمن</h1>
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div variants={cardVariants}>
          <Link to="/admin/users" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-indigo-600">إدارة المستخدمين</h2>
            <p className="mt-2 text-gray-600">عرض وتعديل أدوار وحالة المستخدمين.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/admin/applications" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-indigo-600">إدارة طلبات المطاعم</h2>
            <p className="mt-2 text-gray-600">مراجعة وقبول أو رفض طلبات الانضمام.</p>
          </Link>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Link to="/admin/restaurants" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-indigo-600">إدارة المطاعم</h2>
            <p className="mt-2 text-gray-600">تعليق، تفعيل، أو حذف المطاعم.</p>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminDashboardPage;