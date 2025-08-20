import { useEffect, useState, useCallback, useRef } from 'react';
import { z } from "zod";
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axiosClient from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import type { MenuItem, MenuItemImage } from '../../types';
import { menuItemSchema } from '../../schemas/authSchema';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useConfirmStore } from '../../store/confirmStore';

const ManageMenuPage = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [existingImages, setExistingImages] = useState<MenuItemImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const showConfirm = useConfirmStore((state) => state.show);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof menuItemSchema>>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: { is_available: true },
  });

  const fetchMenu = useCallback(async () => {
    if (!user?.associated_restaurant_id) return;
    setIsLoading(true);
    try {
      const response = await axiosClient.get(`/restaurants/${user.associated_restaurant_id}/menu`);
      setMenuItems(response.data);
    } catch (error) {
      toast.error('فشل في جلب قائمة الطعام.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleOpenModal = (item: MenuItem | null = null) => {
    setEditingItem(item);
    if (item) {
      reset({
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        is_available: item.is_available,
        removable_ingredients: item.removable_ingredients?.join(', ') || ''
      });
      // الصور الموجودة تأتي أصلاً كـ MenuItemImage[] (id + image_url)
      setExistingImages(item.images ?? []);
    } else {
      reset({ name: '', description: '', price: 0, is_available: true, removable_ingredients: '' });
      setExistingImages([]);
    }
    setSelectedFiles([]);
    setImagePreviews([]);
    setImagesToDelete([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      
      const previews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const handleRemoveExistingImage = (imageId: number) => {
    setImagesToDelete(prev => [...prev, imageId]);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const onSubmit: SubmitHandler<z.input<typeof menuItemSchema>> = async (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', (data as any).description || '');
    formData.append('price', String((data as any).price));
    formData.append('is_available', String((data as any).is_available));
    if ((data as any).removable_ingredients) {
      formData.append('removable_ingredients', (data as any).removable_ingredients);
    }

    selectedFiles.forEach(file => {
      formData.append('images', file);
    });
    
    imagesToDelete.forEach(id => {
      formData.append('delete_images', String(id));
    });

    const apiCall = editingItem
      ? axiosClient.put(`/portal/menu/${editingItem.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      : axiosClient.post('/portal/menu', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

    try {
      await toast.promise(apiCall, {
        loading: editingItem ? 'جارٍ تحديث العنصر...' : 'جارٍ إضافة العنصر...',
        success: `تم ${editingItem ? 'تحديث' : 'إضافة'} العنصر بنجاح!`,
        error: `فشل ${editingItem ? 'تحديث' : 'إضافة'} العنصر.`,
      });
      fetchMenu();
      handleCloseModal();
    } catch (error) {
      // Toast handles error
    }
  };
  
  const handleDelete = (itemId: number) => {
    showConfirm(
      'هل أنت متأكد من حذف هذا العنصر من القائمة؟',
      async () => {
        const loadingToast = toast.loading('جارٍ حذف العنصر...');
        try {
          await axiosClient.delete(`/portal/menu/${itemId}`);
          toast.dismiss(loadingToast);
          toast.success('تم حذف العنصر بنجاح!');
          fetchMenu();
        } catch (error: any) {
          toast.dismiss(loadingToast);
          toast.error(error.response?.data?.message || 'فشل حذف العنصر.');
        }
      }
    );
  };

  if (isLoading) {
    return <div className="text-center">جارٍ تحميل القائمة...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">إدارة قائمة الطعام</h1>
        <Button onClick={() => handleOpenModal()}>إضافة عنصر جديد</Button>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <ul className="divide-y divide-gray-200">
          {menuItems.map(item => (
            <li key={item.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-lg">{item.name} - <span className="text-indigo-600">{item.price} ليرة</span></p>
                <p className="text-sm text-gray-500">{item.description}</p>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {item.is_available ? 'متوفر' : 'غير متوفر'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900">تعديل</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">حذف</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingItem ? 'تعديل عنصر' : 'إضافة عنصر جديد'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="اسم الوجبة" type="text" error={errors.name?.message} {...register('name')} />
          <Input label="الوصف" type="text" error={errors.description?.message} {...register('description')} />
          <Input label="السعر" type="number" step="0.01" error={errors.price?.message} {...register('price')} />
          <Input 
            label="المكونات القابلة للإزالة (افصل بينها بفاصلة)" 
            type="text" 
            error={errors.removable_ingredients?.message} 
            {...register('removable_ingredients')} 
            placeholder="مثال: بصل, طماطم, مخلل"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">صور الوجبة</label>
            {existingImages.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-4">
                {existingImages.map(img => (
                  <div key={img.id} className="relative">
                    <img src={img.image_url} alt="Existing" className="h-24 w-full object-cover rounded-md" />
                    <button type="button" onClick={() => handleRemoveExistingImage(img.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs">&times;</button>
                  </div>
                ))}
              </div>
            )}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {imagePreviews.map((src, index) => (
                  <img key={index} src={src} alt={`Preview ${index}`} className="h-24 w-full object-cover rounded-md" />
                ))}
              </div>
            )}
            <div 
                className="mt-4 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                        <p className="pl-1">اختر الصور</p>
                    </div>
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
          </div>

          <div className="flex items-center">
            <input id="is_available" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded" {...register('is_available')} />
            <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">متوفر حالياً</label>
          </div>
          <Button type="submit" isLoading={isSubmitting}>{editingItem ? 'حفظ التغييرات' : 'إضافة العنصر'}</Button>
        </form>
      </Modal>
    </motion.div>
  );
};

export default ManageMenuPage;