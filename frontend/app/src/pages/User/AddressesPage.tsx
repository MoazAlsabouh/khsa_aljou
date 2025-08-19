import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LatLngTuple } from 'leaflet';

import axiosClient from '../../api/axiosClient';
import type { UserAddress } from '../../types/index';
import { addressSchema, type AddressFormInputs } from '../../schemas/authSchema';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import LocationPickerMap from '../../components/portal/LocationPickerMap';
import { useConfirmStore } from '../../store/confirmStore';
import { useAddressStore } from '../../store/addressStore';

const AddressesPage = () => {
  const { addresses, fetchAddresses, isLoading } = useAddressStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLngTuple>([33.5138, 36.2765]);
  const showConfirm = useConfirmStore((state) => state.show);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormInputs>({
    resolver: zodResolver(addressSchema),
  });

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);
  
  const handleOpenModal = (address: UserAddress | null = null) => {
    setEditingAddress(address);
    if (address) {
      reset({ name: address.name, address_line: address.address_line || '' });
      setSelectedLocation([address.location.latitude, address.location.longitude]);
      setIsModalOpen(true);
    } else {
      reset({ name: '', address_line: '' });
      const loadingToast = toast.loading('جارٍ تحديد موقعك...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast.dismiss(loadingToast);
          toast.success('تم تحديد موقعك الحالي.');
          setSelectedLocation([position.coords.latitude, position.coords.longitude]);
          setIsModalOpen(true);
        },
        () => {
          toast.dismiss(loadingToast);
          toast.error('لا يمكن الوصول لموقعك، سيتم استخدام الموقع الافتراضي.');
          setSelectedLocation([33.5138, 36.2765]);
          setIsModalOpen(true);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
  };

  const onSubmit = async (data: AddressFormInputs) => {
    const payload = { 
      ...data, 
      location: { 
        latitude: selectedLocation[0], 
        longitude: selectedLocation[1] 
      } 
    };
    
    const apiCall = editingAddress
      ? axiosClient.put(`/users/me/addresses/${editingAddress.id}`, payload)
      : axiosClient.post('/users/me/addresses', payload);

    try {
      await toast.promise(apiCall, {
        loading: editingAddress ? 'جارٍ تحديث العنوان...' : 'جارٍ إضافة العنوان...',
        success: `تم ${editingAddress ? 'تحديث' : 'إضافة'} العنوان بنجاح!`,
        error: `فشل ${editingAddress ? 'تحديث' : 'إضافة'} العنوان.`,
      });
      fetchAddresses();
      handleCloseModal();
    } catch (error) {}
  };

  const handleDelete = (addressId: number) => {
    showConfirm(
      'هل أنت متأكد من حذف هذا العنوان؟',
      async () => {
        try {
          await toast.promise(axiosClient.delete(`/users/me/addresses/${addressId}`), {
            loading: 'جارٍ الحذف...',
            success: 'تم حذف العنوان بنجاح!',
            error: 'فشل الحذف.',
          });
          fetchAddresses();
        } catch (error) {}
      }
    );
  };

  const handleSetDefault = async (addressId: number) => {
    const loadingToast = toast.loading('جارٍ تعيين العنوان كافتراضي...');
    try {
        await axiosClient.post(`/users/me/addresses/${addressId}/set-default`);
        toast.dismiss(loadingToast);
        toast.success('تم تعيين العنوان كافتراضي بنجاح.');
        fetchAddresses();
    } catch (error) {
        toast.dismiss(loadingToast);
        toast.error('فشلت العملية.');
    }
  };

  if (isLoading) {
    return <div className="text-center">جارٍ تحميل العناوين...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">عناويني المحفوظة</h1>
        <Button onClick={() => handleOpenModal()}>إضافة عنوان جديد</Button>
      </div>
      
      <div className="space-y-4">
        {addresses.length > 0 ? (
          addresses.map(address => (
            <div key={address.id} className={`bg-white shadow rounded-lg p-4 flex justify-between items-center border-2 ${address.is_default ? 'border-indigo-500' : 'border-transparent'}`}>
              <div>
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">{address.name}</p>
                    {address.is_default && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            افتراضي
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-500">{address.address_line}</p>
              </div>
              <div className="flex gap-4">
                {!address.is_default && (
                    <button onClick={() => handleSetDefault(address.id)} className="text-green-600 hover:text-green-900">تعيين كافتراضي</button>
                )}
                <button onClick={() => handleOpenModal(address)} className="text-indigo-600 hover:text-indigo-900">تعديل</button>
                <button onClick={() => handleDelete(address.id)} className="text-red-600 hover:text-red-900">حذف</button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 bg-white shadow rounded-lg p-6">
            لا توجد لديك عناوين محفوظة.
          </p>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAddress ? 'تعديل العنوان' : 'إضافة عنوان جديد'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="اسم العنوان (المنزل، العمل، ...)" type="text" error={errors.name?.message} {...register('name')} />
          <Input label="تفاصيل العنوان" type="text" error={errors.address_line?.message} {...register('address_line')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">حدد الموقع على الخريطة</label>
            <LocationPickerMap 
              mode="location"
              initialLocation={selectedLocation}
              onLocationChange={(newLoc) => setSelectedLocation(newLoc)}
              onAreaChange={() => {}}
            />
          </div>
          <Button type="submit" isLoading={isSubmitting}>{editingAddress ? 'حفظ التغييرات' : 'إضافة العنوان'}</Button>
        </form>
      </Modal>
    </motion.div>
  );
};

export default AddressesPage;