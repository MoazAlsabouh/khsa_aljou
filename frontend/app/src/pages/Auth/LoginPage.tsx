import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '../../store/authStore';
import axiosClient from '../../api/axiosClient';
import { loginSchema, type LoginFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SocialLogins from '../../components/auth/SocialLogins';
import ModernAlert from '../../components/common/ModernAlert';
import { useVerificationStore } from '../../store/verificationStore';

interface ServerErrorState {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);
  const setEmailForVerification = useVerificationStore((state) => state.setEmailForVerification);

  const [serverError, setServerError] = useState<ServerErrorState | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setServerError(null);
    const toastId = 'login-status';
    toast.loading('جارٍ تسجيل الدخول...', { id: toastId });

    try {
      const response = await axiosClient.post('/auth/login', data);
      const { access_token, refresh_token, user: loggedInUser } = response.data;
      
      loginAction({ access: access_token, refresh: refresh_token }, loggedInUser);
      
      toast.success('تم تسجيل الدخول بنجاح! أهلاً بك.', { id: toastId });
      
      if (!loggedInUser.phone_number_verified) {
        navigate('/verify-phone');
      } else {
        navigate('/');
      }

    } catch (err: any) {
      toast.dismiss(toastId);
      const rawMessage = err.response?.data?.message || err.message || '';
      
      if (rawMessage.includes("الحساب غير نشط") || err.response?.status === 403) {
        toast.error('الحساب غير نشط بعد. يرجى تفعيله.', { id: 'auth-err' });
        setServerError({
          title: 'الحساب بانتظار التفعيل',
          message: 'تم تسجيل هذا الحساب مسبقاً ولكن لم يتم تأكيد البريد الإلكتروني بعد.',
          actionText: 'الانتقال لصفحة تفعيل البريد الإلكتروني ←',
          onAction: () => {
            setEmailForVerification(data.identifier);
            navigate('/verify-email');
          },
        });
      } else if (err.response?.status === 401 || rawMessage.includes("بيانات الدخول غير صحيحة")) {
        toast.error('بيانات الدخول غير صحيحة', { id: 'auth-err' });
        setServerError({
          title: 'بيانات الدخول غير صحيحة',
          message: 'البريد الإلكتروني أو كلمة المرور غير متطابقة. يرجى التحقق من المدخلات والمحاولة مرة أخرى.',
          actionText: 'هل نسيت كلمة المرور؟ اضغط هنا لاستعادتها',
          onAction: () => navigate('/forgot-password'),
        });
      } else {
        const fallbackMsg = rawMessage || 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
        toast.error(fallbackMsg, { id: 'auth-err' });
        setServerError({
          title: 'تعذر إتمام تسجيل الدخول',
          message: fallbackMsg,
        });
      }
    }
  };

  const clearError = () => {
    if (serverError) setServerError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-slate-50 to-gray-100 flex flex-col justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md relative overflow-hidden"
      >
        {/* لمسة تصميم علوية أنيقة */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-500 to-orange-400 text-white font-black text-2xl shadow-lg shadow-orange-500/20 mb-3">
            خ
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            تسجيل الدخول
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            مرحباً بك مجدداً في منصة <span className="font-bold text-red-600">خسى الجوع</span>
          </p>
        </div>

        {/* عرض الخطأ العصري بطريقة تفاعلية سلسة */}
        <AnimatePresence>
          {serverError && (
            <div className="mb-6">
              <ModernAlert
                type="error"
                title={serverError.title}
                message={serverError.message}
                actionText={serverError.actionText}
                onAction={serverError.onAction}
                onClose={() => setServerError(null)}
              />
            </div>
          )}
        </AnimatePresence>
        
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Input 
              label="البريد الإلكتروني أو الهاتف" 
              type="text" 
              placeholder="example@domain.com"
              error={errors.identifier?.message} 
              {...register('identifier', { onChange: clearError })} 
            />
          </div>

          <div>
            <Input 
              label="كلمة المرور" 
              type="password" 
              placeholder="••••••••"
              error={errors.password?.message} 
              {...register('password', { onChange: clearError })} 
            />
            <div className="flex items-center justify-end mt-2">
              <Link 
                to="/forgot-password" 
                className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                هل نسيت كلمة المرور؟
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              isLoading={isSubmitting}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-500/25 transition-all transform active:scale-[0.98]"
            >
              دخول
            </Button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="font-bold text-red-600 hover:text-red-700 transition-colors">
              أنشئ حساباً جديداً
            </Link>
          </p>
        </div>

        <SocialLogins />
      </motion.div>
    </div>
  );
};

export default LoginPage;