import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import type { LatLngTuple } from 'leaflet';

import { useAuthStore } from '../../store/authStore';
import type { Restaurant, Location } from '../../types';
import { restaurantSettingsSchema, type RestaurantSettingsFormInputs } from '../../schemas/authSchema';
import axiosClient from '../../api/axiosClient';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LocationPickerMap from '../../components/portal/LocationPickerMap';

const RestaurantSettingsPage = () => {
    const { user } = useAuthStore();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mapMode, setMapMode] = useState<'location' | 'delivery_area'>('location');
    
    const [location, setLocation] = useState<Location | null>(null);
    const [deliveryArea, setDeliveryArea] = useState<Location[]>([]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<RestaurantSettingsFormInputs>({
        resolver: zodResolver(restaurantSettingsSchema),
    });

    useEffect(() => {
        const fetchRestaurant = async () => {
            if (!user?.associated_restaurant_id) {
                toast.error("لا يوجد مطعم مرتبط بهذا الحساب.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const response = await axiosClient.get(`/restaurants/${user.associated_restaurant_id}`);
                const resData = response.data;
                setRestaurant(resData);
                reset({
                    name: resData.name,
                    description: resData.description,
                    logo_url: resData.logo_url,
                    address: resData.address,
                });

                if (resData.location) {
                    setLocation(resData.location);
                } else {
                    // طلب موقع المستخدم إذا لم يكن هناك موقع مسجل
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
                            toast.success('تم تحديد موقعك الحالي.');
                        },
                        () => {
                            toast.error('لا يمكن الوصول لموقعك، سيتم استخدام الموقع الافتراضي.');
                            setLocation({ latitude: 33.5138, longitude: 36.2765 }); // Fallback to Damascus
                        }
                    );
                }
                setDeliveryArea(resData.delivery_area || []);
            } catch (error) {
                toast.error('فشل في جلب بيانات المطعم.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRestaurant();
    }, [user, reset]);

    const onSubmit = async (data: RestaurantSettingsFormInputs) => {
        const loadingToast = toast.loading('جارٍ تحديث الإعدادات...');
        const payload = {
            ...data,
            location,
            delivery_area: deliveryArea,
        };

        try {
            const response = await axiosClient.put('/portal/settings', payload);
            toast.dismiss(loadingToast);
            toast.success('تم تحديث الإعدادات بنجاح!');
            const newRestaurantData = response.data.restaurant;
            setRestaurant(newRestaurantData);
            reset(newRestaurantData);
            setLocation(newRestaurantData.location);
            setDeliveryArea(newRestaurantData.delivery_area || []);
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || 'فشل تحديث الإعدادات.');
        }
    };

    if (isLoading) {
        return <div className="text-center">جارٍ تحميل الإعدادات...</div>;
    }

    if (!restaurant) {
        return <div className="text-center">لا يمكن تحميل إعدادات المطعم.</div>
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">إعدادات المطعم</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg divide-y divide-gray-200">
                <div className="px-4 py-5 sm:p-6 space-y-4">
                    <Input label="اسم المطعم" type="text" error={errors.name?.message} {...register('name')} />
                    <Input label="الوصف" type="text" error={errors.description?.message} {...register('description')} />
                    <Input label="رابط الشعار" type="text" error={errors.logo_url?.message} {...register('logo_url')} />
                    <Input label="العنوان" type="text" error={errors.address?.message} {...register('address')} />
                </div>

                <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-2">الموقع ومنطقة التوصيل</h2>
                    <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg w-fit mb-4">
                        <button type="button" onClick={() => setMapMode('location')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${mapMode === 'location' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600'}`}>تحديد الموقع</button>
                        <button type="button" onClick={() => setMapMode('delivery_area')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${mapMode === 'delivery_area' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600'}`}>رسم منطقة التوصيل</button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        {mapMode === 'location' ? 'انقر على الخريطة لتحديد موقع مطعمك.' : 'انقر على الخريطة لرسم حدود منطقة التوصيل. انقر على "مسح" للبدء من جديد.'}
                    </p>
                    <LocationPickerMap 
                        mode={mapMode}
                        initialLocation={location ? [location.latitude, location.longitude] : undefined}
                        initialArea={Array.isArray(deliveryArea) ? deliveryArea.map(p => [p.latitude, p.longitude] as LatLngTuple) : []}
                        onLocationChange={(loc) => setLocation({ latitude: loc[0], longitude: loc[1] })}
                        onAreaChange={(area) => setDeliveryArea(area.map(p => ({ latitude: p[0], longitude: p[1] })))}
                    />
                </div>

                <div className="px-4 py-3 sm:px-6 flex justify-end">
                    <Button type="submit" isLoading={isSubmitting}>
                        حفظ التغييرات
                    </Button>
                </div>
            </form>
        </motion.div>
    );
};

export default RestaurantSettingsPage;