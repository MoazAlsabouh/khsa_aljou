import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import ConfirmModal from './components/common/ConfirmModal'; // استيراد المكون الجديد
import { useAuthStore } from './store/authStore';
import { useAddressStore } from './store/addressStore';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchAddresses = useAddressStore((state) => state.fetchAddresses);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated, fetchAddresses]);

  return (
    <>
      <Toaster 
        position="top-center"
        reverseOrder={false}
      />
      <ConfirmModal /> {/* إضافة المكون هنا */}
      <AppRoutes />
    </>
  );
}

export default App;