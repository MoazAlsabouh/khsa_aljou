import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { forgotPasswordSchema, type ForgotPasswordFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ForgotPasswordPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormInputs>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormInputs) => {
    const loadingToast = toast.loading('جارٍ إرسال الطلب...');
    try {
      await axiosClient.post('/auth/request-password-reset', data);
      toast.dismiss(loadingToast);
      toast.success('إذا كان البريد الإلكتروني موجوداً، فقد تم إرسال رابط إعادة التعيين إليه.');
      reset();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'حدث خطأ ما. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          إعادة تعيين كلمة المرور
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input label="البريد الإلكتروني" type="email" error={errors.email?.message} {...register('email')} />
            <div>
              <Button type="submit" isLoading={isSubmitting}>
                إرسال رابط إعادة التعيين
              </Button>
            </div>
          </form>
           <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                تذكرت كلمة المرور؟{' '}
                <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  العودة لتسجيل الدخول
                </Link>
              </p>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;