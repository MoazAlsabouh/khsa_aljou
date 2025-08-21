import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { useAuthStore } from '../../store/authStore';
import { updateProfileSchema, type UpdateProfileFormInputs } from '../../schemas/authSchema';
import axiosClient from '../../api/axiosClient';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

// ... (FullUserProfile interface)

const DefaultAvatarBig = () => (
    <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="h-12 w-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 20.993V24H0v-2.997A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    </div>
);

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormInputs>({
    resolver: zodResolver(updateProfileSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        email: user.email,
        phone_number: user.phone_number,
      });
    }
  }, [user, reset]);


  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('profile_image', file);
    const loadingToast = toast.loading('جارٍ رفع الصورة...');
    try {
      const response = await axiosClient.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { user: updatedUserData } = response.data;
      updateUser(updatedUserData);
      toast.dismiss(loadingToast);
      toast.success('تم تحديث الصورة بنجاح!');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'فشل تحديث الصورة.');
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const onSubmit = async (data: UpdateProfileFormInputs) => {
    const payload: { [key: string]: any } = {};
    if (data.name !== user?.name) payload.name = data.name;
    if (data.email !== user?.email) payload.email = data.email;
    if (data.phone_number !== user?.phone_number) payload.phone_number = data.phone_number;

    if (Object.keys(payload).length === 0) {
      toast('لم تقم بتغيير أي بيانات.');
      setIsEditing(false);
      return;
    }
    
    const loadingToast = toast.loading('جارٍ تحديث البيانات...');
    try {
      const response = await axiosClient.put('/users/me', payload);
      const { user: updatedUserData, message, re_verification_needed } = response.data;
      
      toast.dismiss(loadingToast);
      toast.success(message || 'تم تحديث البيانات بنجاح!');
      
      updateUser(updatedUserData);
      reset(updatedUserData);
      setIsEditing(false);

      if (re_verification_needed?.email) {
        toast.error('يجب إعادة تفعيل حسابك. سيتم تسجيل خروجك الآن.', { duration: 5000 });
        setTimeout(() => {
          logout();
          window.location.href = '/login';
        }, 5000);
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'فشل تحديث البيانات.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0 relative">
            {user?.profile_image_url ? (
                <img
                    className="h-24 w-24 rounded-full object-cover"
                    src={user.profile_image_url}
                    alt="User Avatar"
                />
            ) : (
                <DefaultAvatarBig />
            )}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1.5 text-white hover:bg-indigo-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
            </button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
          </div>
          <div className="flex-grow text-center md:text-right">
            <h1 className="text-2xl font-bold text-gray-800">{user?.name || 'مستخدم جديد'}</h1>
            <p className="text-gray-500">{user?.email}</p>
            <p className="text-gray-500">{user?.phone_number}</p>
          </div>
          <div className="flex-shrink-0">
            <Button onClick={() => setIsEditing(!isEditing)} className="w-auto">
              {isEditing ? 'إلغاء التعديل' : 'تعديل البيانات'}
            </Button>
          </div>
        </div>
      </div>
      
      {isEditing ? (
        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit(onSubmit)} className="mt-6 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900">تعديل معلومات الحساب</h2>
            <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <Input label="الاسم" type="text" error={errors.name?.message} {...register('name')} />
              <Input label="البريد الإلكتروني" type="email" error={errors.email?.message} {...register('email')} disabled={!!user?.oauth_provider} />
              <Input label="رقم الهاتف" type="tel" error={errors.phone_number?.message} {...register('phone_number')} />
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6 flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              حفظ التغييرات
            </Button>
          </div>
        </motion.form>
      ) : (
        <div className="mt-6 bg-white shadow rounded-lg p-6 space-y-4">
            <Link to="/change-password" className="font-medium text-indigo-600 hover:text-indigo-700">
                → تغيير كلمة المرور
            </Link>
            {!user?.role.includes('restaurant') && (
                <Link to="/apply-restaurant" className="block font-medium text-green-600 hover:text-green-700">
                    → هل أنت صاحب مطعم؟ انضم إلينا كشريك!
                </Link>
            )}
        </div>
      )}
    </motion.div>
  );
};

export default ProfilePage;