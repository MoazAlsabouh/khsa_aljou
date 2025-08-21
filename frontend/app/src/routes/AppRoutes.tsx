import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import ForgotPasswordPage from '../pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/Auth/ResetPasswordPage';
import OAuthCallbackPage from '../pages/Auth/OAuthCallbackPage';
import VerifyEmailPage from '../pages/Auth/VerifyEmailPage';
import VerifyPhonePage from '../pages/Auth/VerifyPhonePage';
import ProfilePage from '../pages/User/ProfilePage';
import ChangePasswordPage from '../pages/User/ChangePasswordPage';
import ApplyRestaurantPage from '../pages/User/ApplyRestaurantPage';
import AddressesPage from '../pages/User/AddressesPage';
import RestaurantsPage from '../pages/Restaurants/RestaurantsPage';
import RestaurantDetailPage from '../pages/Restaurants/RestaurantDetailPage';
import OrdersListPage from '../pages/Orders/OrdersListPage';
import OrderDetailPage from '../pages/Orders/OrderDetailPage';
import AdminDashboardPage from '../pages/Admin/AdminDashboardPage';
import UsersManagementPage from '../pages/Admin/UsersManagementPage';
import ApplicationsManagementPage from '../pages/Admin/ApplicationsManagementPage';
import RestaurantsManagementPage from '../pages/Admin/RestaurantsManagementPage';
import PortalDashboardPage from '../pages/Portal/PortalDashboardPage';
import PortalOrdersPage from '../pages/Portal/PortalOrdersPage';
import ManageMenuPage from '../pages/Portal/ManageMenuPage';
import RestaurantSettingsPage from '../pages/Portal/RestaurantSettingsPage';
import TeamManagementPage from '../pages/Portal/TeamManagementPage';
import StatisticsPage from '../pages/Portal/StatisticsPage';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import type { User } from '../types';

const AppRoutes = () => {
  const managerRoles: User['role'][] = ['restaurant_manager', 'restaurant_admin'];
  const adminRoles: User['role'][] = ['manager', 'admin'];

  return (
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        
        {/* Protected Routes with AppLayout */}
        <Route path="/" element={<AppLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<RestaurantsPage />} />
            <Route path="restaurants/:restaurantId" element={<RestaurantDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="verify-phone" element={<VerifyPhonePage />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route path="orders/:orderId" element={<OrderDetailPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
            <Route path="apply-restaurant" element={<ApplyRestaurantPage />} />
            <Route path="addresses" element={<AddressesPage />} />
          </Route>

          {/* Portal Routes for Managers */}
          <Route element={<ProtectedRoute allowedRoles={managerRoles} />}>
            <Route path="portal" element={<PortalDashboardPage />} />
            <Route path="portal/orders" element={<PortalOrdersPage />} />
            <Route path="portal/menu" element={<ManageMenuPage />} />
            <Route path="portal/settings" element={<RestaurantSettingsPage />} />
            <Route path="portal/team" element={<TeamManagementPage />} />
            <Route path="portal/statistics" element={<StatisticsPage />} />
          </Route>
          
          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={adminRoles} />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/users" element={<UsersManagementPage />} />
            <Route path="admin/applications" element={<ApplicationsManagementPage />} />
            <Route path="admin/restaurants" element={<RestaurantsManagementPage />} />
          </Route>
        </Route>

        {/* Fallback Routes */}
        <Route path="/unauthorized" element={<h1>غير مصرح لك بالوصول</h1>} />
        <Route path="*" element={<h1>404 - الصفحة غير موجودة</h1>} />
      </Routes>
  );
};

export default AppRoutes;