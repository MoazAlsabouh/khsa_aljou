import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import axiosClient from '../../api/axiosClient';
import { registerSchema, type RegisterFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SocialLogins from '../../components/auth/SocialLogins';
import ModernAlert from '../../components/common/ModernAlert';
import { useVerificationStore } from '../../store/verificationStore';

const RegisterPage = () => {
  const navigate = useNavigate();
  const setEmailForVerification = useVerificationStore((state) => state.setEmailForVerification);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    setServerError(null);
    const toastId = 'register-status';
    toast.loading('جارٍ إنشاء الحساب...', { id: toastId });

    try {
      await axiosClient.post('/auth/register', {
        email: data.email,
        phone_number: data.phone_number,
        password: data.password,
        name: data.name,
      });
      
      toast.success('تم إنشاء الحساب بنجاح! يرجى تأكيد بريدك الإلكتروني.', { id: toastId });
      setEmailForVerification(data.email);
      navigate('/verify-email');

    } catch (err: any) {
      toast.dismiss(toastId);
      const errorMsg = err.response?.data?.message || 'تعذر إنشاء الحساب حالياً. يرجى مراجعة البيانات المدخلة.';
      toast.error(errorMsg, { id: 'reg-err' });
      setServerError(errorMsg);
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
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-500 to-orange-400 text-white font-black text-2xl shadow-lg shadow-orange-500/20 mb-3">
            خ
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            إنشاء حساب جديد
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            انضم إلى منصة <span className="font-bold text-red-600">خسى الجوع</span> لتجربة توصيل استثنائية
          </p>
        </div>

        <AnimatePresence>
          {serverError && (
            <div className="mb-5">
              <ModernAlert
                type="error"
                title="تعذر إنشاء الحساب"
                message={serverError}
                onClose={() => setServerError(null)}
              />
            </div>
          )}
        </AnimatePresence>
        
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input 
            label="الاسم الكامل" 
            type="text" 
            error={errors.name?.message} 
            {...register('name', { onChange: clearError })} 
          />
          <Input 
            label="البريد الإلكتروني" 
            type="email" 
            error={errors.email?.message} 
            {...register('email', { onChange: clearError })} 
          />
          <Input 
            label="رقم الهاتف" 
            type="tel" 
            placeholder="09XXXXXXXX"
            error={errors.phone_number?.message} 
            {...register('phone_number', { onChange: clearError })} 
          />
          <Input 
            label="كلمة المرور" 
            type="password" 
            error={errors.password?.message} 
            {...register('password', { onChange: clearError })} 
          />
          <Input 
            label="تأكيد كلمة المرور" 
            type="password" 
            error={errors.confirmPassword?.message} 
            {...register('confirmPassword', { onChange: clearError })} 
          />
          <div className="pt-2">
            <Button 
              type="submit" 
              isLoading={isSubmitting}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-500/25 transition-all transform active:scale-[0.98]"
            >
              إنشاء الحساب
            </Button>
          </div>
        </form>

        <div className="text-center mt-5">
          <p className="text-sm text-gray-600">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="font-bold text-red-600 hover:text-red-700 transition-colors">
              سجل الدخول
            </Link>
          </p>
        </div>

        <SocialLogins />
      </motion.div>
    </div>
  );
};

export default RegisterPage;