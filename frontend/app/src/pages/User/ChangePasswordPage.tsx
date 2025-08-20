import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { changePasswordSchema, type ChangePasswordFormInputs } from '../../schemas/authSchema';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ChangePasswordPage = () => {
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordFormInputs>({
        resolver: zodResolver(changePasswordSchema),
    });

    const onSubmit = async (data: ChangePasswordFormInputs) => {
        const loadingToast = toast.loading('جارٍ تغيير كلمة المرور...');
        try {
            await axiosClient.put('/users/me', {
                old_password: data.old_password,
                new_password: data.new_password,
            });
            toast.dismiss(loadingToast);
            toast.success('تم تغيير كلمة المرور بنجاح.');
            navigate('/profile');
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || 'فشلت العملية.');
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="max-w-lg mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">تغيير كلمة المرور</h1>
                <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg p-6 space-y-4">
                    <Input label="كلمة المرور القديمة" type="password" error={errors.old_password?.message} {...register('old_password')} />
                    <Input label="كلمة المرور الجديدة" type="password" error={errors.new_password?.message} {...register('new_password')} />
                    <Input label="تأكيد كلمة المرور الجديدة" type="password" error={errors.confirm_password?.message} {...register('confirm_password')} />
                    <Button type="submit" isLoading={isSubmitting}>حفظ التغييرات</Button>
                </form>
            </div>
        </motion.div>
    );
};

export default ChangePasswordPage;
