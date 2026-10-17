import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import axiosClient from '../../api/axiosClient';
import { otpSchema, type OtpFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';

const VerifyPhonePage = () => {
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const { user, fetchAndSetUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormInputs>({
    resolver: zodResolver(otpSchema),
  });

  useEffect(() => {
    // بدء العد التنازلي عند إرسال الرمز لأول مرة
    if (isCodeSent && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [timer, isCodeSent]);

  const handleRequestCode = async () => {
    setIsRequestingCode(true);
    const loadingToast = toast.loading('جارٍ إرسال رمز التحقق...');
    try {
      const response = await axiosClient.post('/auth/request-phone-verification-code');
      toast.dismiss(loadingToast);
      toast.success(response.data.message); // عرض الرسالة الديناميكية من الواجهة الخلفية
      setIsCodeSent(true);
      setTimer(300); // Reset timer
      setCanResend(false);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'فشل إرسال الرمز. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsRequestingCode(false);
    }
  };

  const onSubmit = async (data: OtpFormInputs) => {
    const loadingToast = toast.loading('جارٍ التحقق من الرمز...');
    try {
      await axiosClient.post('/auth/verify-phone', { code: data.otp });
      toast.dismiss(loadingToast);
      toast.success('تم التحقق من رقم هاتفك بنجاح!');
      await fetchAndSetUser(); // تحديث بيانات المستخدم في الحالة العامة
      navigate('/'); // توجيه للصفحة الرئيسية
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'الرمز غير صحيح أو انتهت صلاحيته.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white shadow rounded-lg p-6 max-w-lg mx-auto"
    >
      <h1 className="text-2xl font-bold text-gray-800 mb-4">التحقق من رقم الهاتف</h1>
      {!isCodeSent ? (
        <div className="text-center">
          <p className="mb-4 text-gray-600">
            لتأمين حسابك، يرجى التحقق من رقم هاتفك المسجل: <strong>{user?.phone_number}</strong>
          </p>
          <Button onClick={handleRequestCode} isLoading={isRequestingCode}>
            إرسال رمز التحقق
          </Button>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <p className="text-gray-600">
            الرجاء إدخال الرمز المكون من 6 أرقام الذي تم إرساله إلى هاتفك.
          </p>
          <Input
            label="رمز التحقق (OTP)"
            type="text"
            error={errors.otp?.message}
            {...register('otp')}
            maxLength={6}
          />
          <div className="text-center text-sm text-gray-500">
              {timer > 0 && !canResend ? (
                <p>يمكنك إعادة إرسال الرمز بعد: {Math.floor(timer / 60)}:{('0' + timer % 60).slice(-2)}</p>
              ) : (
                <button type="button" onClick={handleRequestCode} disabled={isRequestingCode} className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50">
                  {isRequestingCode ? 'جارٍ الإرسال...' : 'إعادة إرسال الرمز'}
                </button>
              )}
            </div>
          <div>
            <Button type="submit" isLoading={isSubmitting}>
              التحقق من الرمز
            </Button>
          </div>
        </form>
      )}
    </motion.div>
  );
};

export default VerifyPhonePage;