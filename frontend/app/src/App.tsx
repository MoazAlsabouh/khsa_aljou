import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import ConfirmModal from './components/common/ConfirmModal';

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
      />
      <ConfirmModal />
      <BrowserRouter>
        <RedirectHandler />
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}

export default App;
