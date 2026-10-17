import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import ConfirmModal from './components/common/ConfirmModal';
import PWAInstallBanner from './components/common/PWAInstallBanner';

// مكون مساعد لمعالجة إعادة التوجيه
const RedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirectPath');
    // تحقق من وجود مسار محفوظ وأنه ليس الصفحة الرئيسية لتجنب الحلقات اللانهائية
    if (redirectPath && redirectPath !== location.pathname) {
      sessionStorage.removeItem('redirectPath');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, location.pathname]);

  return null; // هذا المكون لا يعرض أي شيء
};

function App() {
  return (
    <>
      <Toaster 
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#1E293B',
            color: '#F8FAFC',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '12px 18px',
            direction: 'rtl',
            fontFamily: 'inherit',
          },
          success: {
            style: {
              background: '#F0FDF4',
              color: '#15803D',
              border: '1px solid #BBF7D0',
            },
            iconTheme: {
              primary: '#16A34A',
              secondary: '#FFFFFF',
            },
          },
          error: {
            style: {
              background: '#FFF1F2',
              color: '#BE123C',
              border: '1px solid #FECDD3',
            },
            iconTheme: {
              primary: '#E11D48',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
      <ConfirmModal />
      <PWAInstallBanner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <RedirectHandler />
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}

export default App;
