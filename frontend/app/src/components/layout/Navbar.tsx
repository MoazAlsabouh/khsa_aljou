import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const DefaultAvatar = () => (
    <svg className="h-8 w-8 rounded-full text-gray-300 bg-gray-100" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 20.993V24H0v-2.997A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isRestaurantManager = user?.role === 'restaurant_manager' || user?.role === 'restaurant_admin';
  const isSiteAdmin = user?.role === 'admin' || user?.role === 'manager';

  const handleLogout = () => {
    logout();
    toast.success('تم تسجيل الخروج بنجاح.');
    navigate('/login');
  };


  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* قسم المستخدم والملف الشخصي (يمين الشاشة) */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 focus:outline-none"
            >
              {user?.profile_image_url ? (
                <img
                    className="h-8 w-8 rounded-full object-cover"
                    src={user.profile_image_url}
                    alt="User Avatar"
                />
              ) : (
                <DefaultAvatar />
              )}
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name || user?.email}</span>
            </button>
            {isMenuOpen && (
              <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" dir="rtl">
                  <div className="px-4 py-2">
                    <p className="text-sm font-semibold text-right">{user?.name}</p>
                    <p className="text-sm text-gray-500 truncate text-right">{user?.email}</p>
                  </div>
                  <hr/>
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-right" onClick={() => setIsMenuOpen(false)}>
                    الملف الشخصي
                  </Link>
                  {isRestaurantManager && (
                    <Link to="/portal" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-right" onClick={() => setIsMenuOpen(false)}>
                      بوابة المطعم
                    </Link>
                  )}
                  {!isRestaurantManager && !isSiteAdmin && (
                    <Link to="/apply-restaurant" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-right" onClick={() => setIsMenuOpen(false)}>
                      كن شريكاً معنا
                    </Link>
                  )}
                  <hr/>
                  <button onClick={handleLogout} className="w-full text-right block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* قسم الروابط واسم التطبيق (يسار الشاشة) */}
          <div className="flex items-center space-x-4">
            {isSiteAdmin && (
                <Link to="/admin" className="text-sm font-medium text-red-600 hover:text-red-500">
                    لوحة التحكم
                </Link>
            )}
            <Link to="/orders" className="text-sm font-medium text-gray-600 hover:text-indigo-500">
              طلباتي
            </Link>
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-indigo-500">
              الرئيسية
            </Link>
            <Link to="/" className="text-2xl font-bold text-indigo-600">
              خسى الجوع
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;