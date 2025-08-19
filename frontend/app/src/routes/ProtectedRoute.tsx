import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  allowedRoles?: ('user' | 'manager' | 'admin' | 'customer' | 'restaurant_admin' | 'restaurant_manager')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // جديد: التحقق من تفعيل رقم الهاتف
  // إذا لم يكن الهاتف مفعلاً، يتم تحويل المستخدم دائماً لصفحة التفعيل
  // إلا إذا كان يحاول الوصول لصفحة التفعيل نفسها
  if (user && !user.phone_number_verified && location.pathname !== '/verify-phone') {
    return <Navigate to="/verify-phone" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;