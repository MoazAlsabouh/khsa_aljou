import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const DefaultAvatar = () => (
  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-400">
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 20.993V24H0v-2.997A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  </div>
);

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isRestaurantManager = user?.role === 'restaurant_manager' || user?.role === 'restaurant_admin';
  const isSiteAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isCourier = user?.role === 'courier' || isSiteAdmin;

  const handleLogout = () => {
    logout();
    toast.success('تم تسجيل الخروج بنجاح.');
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
      case 'manager':
        return { text: 'الإدارة العامة', color: 'bg-red-50 text-red-600 border-red-200' };
      case 'courier':
        return { text: 'مندوب توصيل', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
      case 'restaurant_manager':
      case 'restaurant_admin':
        return { text: 'مدير مطعم', color: 'bg-orange-50 text-orange-600 border-orange-200' };
      default:
        return { text: 'عميل', color: 'bg-gray-50 text-gray-600 border-gray-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* الجانب الأيمن (بداية القراءة في العربية): الشعار، اسم المنصة، وروابط التنقل */}
          <div className="flex items-center gap-6">
            {/* الشعار واسم التطبيق */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
                خ
              </div>
              <span className="text-2xl font-black bg-gradient-to-l from-red-600 to-orange-600 bg-clip-text text-transparent tracking-tight">
                خسى الجوع
              </span>
            </Link>

            {/* روابط التنقل الرئيسية (تبدأ بجانب الشعار وتتجه يساراً) */}
            <div className="hidden md:flex items-center gap-4">
              <Link 
                to="/" 
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-gray-700 hover:text-red-600 hover:bg-red-50/60 transition-all"
              >
                الرئيسية
              </Link>
              <Link 
                to="/orders" 
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-gray-700 hover:text-red-600 hover:bg-red-50/60 transition-all"
              >
                طلباتي
              </Link>
              {isCourier && (
                <Link 
                  to="/courier" 
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/60 flex items-center gap-1.5 transition-all"
                >
                  <span>🛵</span>
                  <span>بوابة المندوب</span>
                </Link>
              )}
              {isSiteAdmin && (
                <Link 
                  to="/admin" 
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1.5 transition-all"
                >
                  <span>⚙️</span>
                  <span>لوحة التحكم</span>
                </Link>
              )}
            </div>
          </div>

          {/* الجانب الأيسر (نهاية القراءة في العربية): الملف الشخصي للمستخدم والقائمة المنسدلة */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none"
            >
              {user?.profile_image_url ? (
                <img
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-red-100"
                  src={user.profile_image_url}
                  alt="User Avatar"
                />
              ) : (
                <DefaultAvatar />
              )}
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-bold text-gray-800 leading-tight">
                  {user?.name || user?.email}
                </span>
                <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${roleInfo.color} w-fit`}>
                  {roleInfo.text}
                </span>
              </div>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* القائمة المنسدلة للملف الشخصي (تفتح محاذية لليسار) */}
            {isMenuOpen && (
              <div className="origin-top-left absolute left-0 mt-2 w-64 rounded-2xl shadow-2xl bg-white border border-gray-100 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100/70 text-right">
                  <p className="text-sm font-bold text-gray-900">{user?.name || 'مرحباً بك'}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                  <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                    {roleInfo.text}
                  </span>
                </div>

                <div className="py-2 text-right">
                  {/* روابط الشاشات الصغيرة للموبايل */}
                  <div className="md:hidden border-b border-gray-100 pb-2 mb-2">
                    <Link
                      to="/"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>🏠</span>
                      <span>الرئيسية</span>
                    </Link>
                    <Link
                      to="/orders"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>📦</span>
                      <span>طلباتي</span>
                    </Link>
                  </div>

                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>👤</span>
                    <span>الملف الشخصي</span>
                  </Link>
                  {isRestaurantManager && (
                    <Link
                      to="/portal"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>🍽️</span>
                      <span>بوابة المطعم</span>
                    </Link>
                  )}
                  {isCourier && (
                    <Link
                      to="/courier"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>🛵</span>
                      <span>بوابة المندوب</span>
                    </Link>
                  )}
                  {isSiteAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>⚙️</span>
                      <span>لوحة التحكم</span>
                    </Link>
                  )}
                  {!isRestaurantManager && !isSiteAdmin && user?.role !== 'courier' && (
                    <Link
                      to="/apply-restaurant"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>🤝</span>
                      <span>كن شريكاً معنا</span>
                    </Link>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span>🚪</span>
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;