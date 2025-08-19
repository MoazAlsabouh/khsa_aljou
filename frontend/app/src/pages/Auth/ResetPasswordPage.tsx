import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import axiosClient from '../../api/axiosClient';
import { resetPasswordSchema, type ResetPasswordFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ResetPasswordPage = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInputs>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormInputs) => {
    const loadingToast = toast.loading('جارٍ تحديث كلمة المرور...');
    try {
      await axiosClient.post('/auth/reset-password', {
        email: data.email,
        code: data.code,
        new_password: data.new_password,
      });
      toast.dismiss(loadingToast);
      toast.success('تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
      navigate('/login');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'الرمز غير صالح أو انتهت صلاحيته.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          تعيين كلمة مرور جديدة
        </h2>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input label="البريد الإلكتروني" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="رمز إعادة التعيين" type="text" error={errors.code?.message} {...register('code')} />
            <Input label="كلمة المرور الجديدة" type="password" error={errors.new_password?.message} {...register('new_password')} />
            <Input label="تأكيد كلمة المرور الجديدة" type="password" error={errors.confirm_password?.message} {...register('confirm_password')} />
            <div>
              <Button type="submit" isLoading={isSubmitting}>
                حفظ كلمة المرور الجديدة
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;