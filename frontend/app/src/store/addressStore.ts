import { create } from 'zustand';
import type { UserAddress } from '../types';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

interface AddressState {
  addresses: UserAddress[]; // قائمة بجميع العناوين
  selectedAddress: UserAddress | null; // العنوان الفعال حالياً (الافتراضي)
  isLoading: boolean;
  fetchAddresses: () => Promise<void>; // جلب قائمة العناوين
  fetchAndSetDefaultAddress: () => Promise<void>; // جلب وتعيين العنوان الافتراضي
  setDefaultAddress: (addressId: number) => Promise<void>; // دالة لتغيير العنوان الافتراضي
  setSelectedAddress: (address: UserAddress | null) => void;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  selectedAddress: null,
  isLoading: true,
  
  fetchAddresses: async () => {
    try {
      const response = await axiosClient.get('/users/me/addresses');
      set({ addresses: response.data });
    } catch (error) {
      console.error('Failed to fetch all addresses');
      set({ addresses: [] });
    }
  },

  fetchAndSetDefaultAddress: async () => {
    set({ isLoading: true });
    try {
      const response = await axiosClient.get('/users/me/addresses/default');
      set({ selectedAddress: response.data, isLoading: false });
    } catch (error) {
      // لا يوجد عنوان افتراضي، لذا سنجلب الكل ونختار الأول
      try {
        const allResponse = await axiosClient.get('/users/me/addresses');
        const allAddresses: UserAddress[] = allResponse.data;
        if (allAddresses.length > 0) {
          set({ selectedAddress: allAddresses[0], isLoading: false });
        } else {
          set({ selectedAddress: null, isLoading: false });
        }
      } catch (error) {
        toast.error('فشل في جلب العناوين.');
        set({ isLoading: false });
      }
    }
  },

  setDefaultAddress: async (addressId: number) => {
    const { addresses } = get();
    const newSelectedAddress = addresses.find(a => a.id === addressId);

    if (!newSelectedAddress) return;

    // تحديث الواجهة فوراً لتجربة مستخدم أفضل
    set({ selectedAddress: newSelectedAddress });

    const loadingToast = toast.loading('جارٍ تعيين العنوان كافتراضي...');
    try {
      await axiosClient.post(`/users/me/addresses/${addressId}/set-default`);
      toast.dismiss(loadingToast);
      toast.success('تم تحديث العنوان الافتراضي.');
      // إعادة جلب القائمة الكاملة في الخلفية لتحديث علامة 'is_default'
      await get().fetchAddresses();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("فشل في تعيين العنوان كافتراضي.");
      // إعادة جلب البيانات عند الفشل لضمان التناسق
      await get().fetchAddresses();
    }
  },
  setSelectedAddress: (address: UserAddress | null) => {
    set({ selectedAddress: address });
  },
}));