import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

import { useAuthStore } from '../../store/authStore';
import axiosClient from '../../api/axiosClient';
import { loginSchema, type LoginFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SocialLogins from '../../components/auth/SocialLogins';
import { useVerificationStore } from '../../store/verificationStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);
  const setEmailForVerification = useVerificationStore((state) => state.setEmailForVerification);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    const loadingToast = toast.loading('جارٍ تسجيل الدخول...');
    try {
      const response = await axiosClient.post('/auth/login', data);
      const { access_token, refresh_token, user: loggedInUser } = response.data;
      
      loginAction({ access: access_token, refresh: refresh_token }, loggedInUser);
      
      toast.dismiss(loadingToast);
      toast.success('تم تسجيل الدخول بنجاح!');
      
      // منطق التوجيه الجديد
      if (!loggedInUser.phone_number_verified) {
        navigate('/verify-phone');
      } else {
        navigate('/'); // التوجيه للصفحة الرئيسية
      }

    } catch (err: any) {
      toast.dismiss(loadingToast);
      const errorMessage = err.response?.data?.message || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.';

      if (errorMessage.includes("الحساب غير نشط")) {
        toast.error(errorMessage);
        setEmailForVerification(data.identifier);
        navigate('/verify-email');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            تسجيل الدخول
          </h2>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input label="البريد الإلكتروني" type="email" error={errors.identifier?.message} {...register('identifier')} />
          <div>
              <Input label="كلمة المرور" type="password" error={errors.password?.message} {...register('password')} />
              <div className="flex items-center justify-end mt-2">
                  <div className="text-sm">
                      <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                          هل نسيت كلمة المرور؟
                      </Link>
                  </div>
              </div>
          </div>
          <div>
            <Button type="submit" isLoading={isSubmitting}>دخول</Button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
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