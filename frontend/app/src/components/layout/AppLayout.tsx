import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useAddressStore } from '../../store/addressStore';
import { useAuthStore } from '../../store/authStore';

const AppLayout = () => {
  const { isAuthenticated, fetchAndSetUser } = useAuthStore();
  const { fetchAddresses, fetchAndSetDefaultAddress } = useAddressStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAndSetUser();
      fetchAddresses(); // جلب قائمة العناوين الكاملة
      fetchAndSetDefaultAddress(); // جلب وتعيين العنوان الافتراضي النشط
    }
  }, [isAuthenticated, fetchAndSetUser, fetchAddresses, fetchAndSetDefaultAddress]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;