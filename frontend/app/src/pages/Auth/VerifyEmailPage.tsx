import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import axiosClient from '../../api/axiosClient';
import { verifyEmailSchema, type VerifyEmailFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useVerificationStore } from '../../store/verificationStore';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const { emailForVerification, setEmailForVerification } = useVerificationStore();
  
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormInputs>({
    resolver: zodResolver(verifyEmailSchema),
  });

  useEffect(() => {
    if (emailForVerification) {
      setValue('email', emailForVerification);
    }
  }, [emailForVerification, setValue]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleResendCode = async () => {
    if (!emailForVerification) {
      toast.error('البريد الإلكتروني غير متوفر لإعادة الإرسال.');
      return;
    }

    const loadingToast = toast.loading('جارٍ إعادة إرسال الرمز...');
    try {
      // الواجهة الخلفية هي المسؤولة الآن عن تحديد المعدل
      await axiosClient.post('/auth/resend-verification', { email: emailForVerification });
      toast.dismiss(loadingToast);
      toast.success('تم إرسال رمز جديد.');
      setTimer(300); // Reset timer
      setCanResend(false);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      // عرض رسالة الخطأ القادمة من الواجهة الخلفية مباشرة
      toast.error(error.response?.data?.message || 'فشل إرسال الرمز.');
    }
  };

  const onSubmit = async (data: VerifyEmailFormInputs) => {
    const loadingToast = toast.loading('جارٍ التحقق...');
    try {
      await axiosClient.post('/auth/verify-email', data);
      toast.dismiss(loadingToast);
      toast.success('تم تفعيل حسابك بنجاح! سيتم توجيهك الآن.');
      setEmailForVerification(null); // Clear email from store
      setTimeout(() => navigate('/verify-phone'), 2000); // توجيه للتحقق من الهاتف
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'فشل التحقق. الرمز قد يكون غير صحيح.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          تفعيل الحساب
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          أدخل بريدك الإلكتروني والرمز الذي تم إرساله إليك.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input label="البريد الإلكتروني" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="رمز التحقق" type="text" error={errors.code?.message} {...register('code')} />
            
            <div className="text-center text-sm text-gray-500">
              {timer > 0 ? (
                <p>صلاحية الرمز تنتهي خلال: {Math.floor(timer / 60)}:{('0' + timer % 60).slice(-2)}</p>
              ) : (
                <button type="button" onClick={handleResendCode} disabled={!canResend} className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50">
                  إعادة إرسال الرمز
                </button>
              )}
            </div>

            <div>
              <Button type="submit" isLoading={isSubmitting}>
                تفعيل
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
