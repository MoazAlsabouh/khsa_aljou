import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);

  useEffect(() => {
    const accessToken = searchParams.get('token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      try {
        const decodedUser: any = jwtDecode(accessToken);
        loginAction({ access: accessToken, refresh: refreshToken }, decodedUser);
        toast.success('تم تسجيل الدخول بنجاح!');

        // منطق التوجيه الجديد
        if (!decodedUser.phone_number_verified) {
            navigate('/verify-phone');
        } else {
            navigate('/'); // التوجيه للصفحة الرئيسية
        }

      } catch (error) {
        console.error("Failed to decode token or login", error);
        toast.error('فشل في عملية المصادقة.');
        navigate('/login');
      }
    } else {
      const error = searchParams.get('error');
      toast.error(error || 'فشل في الحصول على بيانات المصادقة.');
      navigate('/login');
    }
  }, [searchParams, loginAction, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>جارٍ تسجيل الدخول...</div>
    </div>
  );
};

export default OAuthCallbackPage;