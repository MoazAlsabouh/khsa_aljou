import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

import axiosClient from '../../api/axiosClient';
import { registerSchema, type RegisterFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SocialLogins from '../../components/auth/SocialLogins';
import { useVerificationStore } from '../../store/verificationStore'; // استيراد المخزن الجديد

const RegisterPage = () => {
  const navigate = useNavigate();
  const setEmailForVerification = useVerificationStore((state) => state.setEmailForVerification);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    const loadingToast = toast.loading('جارٍ إنشاء الحساب...');
    try {
      await axiosClient.post('/auth/register', {
        email: data.email,
        phone_number: data.phone_number,
        password: data.password,
        name: data.name,
      });
      
      toast.dismiss(loadingToast);
      toast.success('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيله.');
      
      // حفظ البريد الإلكتروني وتوجيه المستخدم لصفحة التحقق
      setEmailForVerification(data.email);
      navigate('/verify-email');

    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء إنشاء الحساب.');
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
            إنشاء حساب جديد
          </h2>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input label="الاسم الكامل" type="text" error={errors.name?.message} {...register('name')} />
          <Input label="البريد الإلكتروني" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="رقم الهاتف" type="tel" error={errors.phone_number?.message} {...register('phone_number')} />
          <Input label="كلمة المرور" type="password" error={errors.password?.message} {...register('password')} />
          <Input label="تأكيد كلمة المرور" type="password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          <div>
            <Button type="submit" isLoading={isSubmitting}>إنشاء الحساب</Button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
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