import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { LatLngTuple } from 'leaflet';

import axiosClient from '../../api/axiosClient';
import { applyRestaurantSchema, type ApplyRestaurantFormInputs } from '../../schemas/authSchema';
import type { Location } from '../../types';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LocationPickerMap from '../../components/portal/LocationPickerMap';

const ApplyRestaurantPage = () => {
    const navigate = useNavigate();
    const [mapMode, setMapMode] = useState<'location' | 'delivery_area'>('location');
    const [location, setLocation] = useState<Location | null>(null);
    const [deliveryArea, setDeliveryArea] = useState<Location[]>([]);
    const [isLocationLoading, setIsLocationLoading] = useState(true);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [initialMapCenter, setInitialMapCenter] = useState<LatLngTuple>([33.5138, 36.2765]); 

    const {
        register,
        handleSubmit,
        reset, // تمت الإضافة هنا
        formState: { errors, isSubmitting },
    } = useForm<ApplyRestaurantFormInputs>({
        resolver: zodResolver(applyRestaurantSchema),
    });

    const getGeolocation = useCallback(() => {
        setIsLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords: LatLngTuple = [position.coords.latitude, position.coords.longitude];
                setInitialMapCenter(coords);
                setLocation({ latitude: coords[0], longitude: coords[1] });
                setIsLocationLoading(false);
            },
            () => {
                toast.error('لا يمكن الوصول لموقعك، سيتم استخدام الموقع الافتراضي.');
                setLocation({ latitude: initialMapCenter[0], longitude: initialMapCenter[1] });
                setIsLocationLoading(false);
            },
            { enableHighAccuracy: true }
        );
    }, [initialMapCenter]);

    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
                if (permissionStatus.state === 'granted') {
                    getGeolocation();
                } else if (permissionStatus.state === 'prompt') {
                    getGeolocation();
                } else {
                    toast.error('تم رفض الوصول للموقع. سيتم استخدام الموقع الافتراضي.');
                    setLocation({ latitude: initialMapCenter[0], longitude: initialMapCenter[1] });
                    setIsLocationLoading(false);
                }
            });
        } else {
            getGeolocation();
        }
    }, [getGeolocation, initialMapCenter]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const onSubmit = async (data: ApplyRestaurantFormInputs) => {
        if (!location) {
            toast.error("الرجاء تحديد موقع المطعم على الخريطة.");
            return;
        }
        if (!logoFile) {
            toast.error("الرجاء رفع شعار للمطعم.");
            return;
        }

        const formData = new FormData();
        formData.append('restaurant_name', data.restaurant_name);
        formData.append('description', data.description);
        formData.append('address', data.address);
        formData.append('location_lat', String(location.latitude));
        formData.append('location_lon', String(location.longitude));
        formData.append('logo', logoFile);

        const deliveryAreaGeoJSON = deliveryArea.length > 2 ? JSON.stringify({
            type: "Polygon",
            coordinates: [[...deliveryArea, deliveryArea[0]].map(p => [p.longitude, p.latitude])]
        }) : null;

        if (deliveryAreaGeoJSON) {
            formData.append('delivery_area_geojson', deliveryAreaGeoJSON);
        }
        
        const loadingToast = toast.loading('جارٍ إرسال طلبك...');
        try {
            await axiosClient.post('/users/apply_restaurant_manager', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.dismiss(loadingToast);
            toast.success('تم إرسال طلبك بنجاح! ستتم مراجعته قريباً.');
            
            // تصفير النموذج والحالة
            reset();
            setLogoFile(null);
            setLogoPreview(null);
            setLocation(null);
            setDeliveryArea([]);

            // التوجيه للصفحة الرئيسية
            navigate('/');
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error(err.response?.data?.message || 'فشل إرسال الطلب.');
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">كن شريكاً معنا</h1>
                <p className="text-gray-600 mb-6 text-center">املأ النموذج التالي لتقديم طلب تسجيل مطعمك في منصتنا.</p>
                <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-lg rounded-lg p-8 space-y-6">
                    <Input label="اسم المطعم" type="text" error={errors.restaurant_name?.message} {...register('restaurant_name')} />
                    <Input label="وصف قصير للمطعم" type="text" error={errors.description?.message} {...register('description')} />
                    <Input label="عنوان المطعم التفصيلي" type="text" error={errors.address?.message} {...register('address')} />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">شعار المطعم</label>
                        <div 
                            className="mt-2 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {logoPreview ? (
                                <img src={logoPreview} alt="معاينة الشعار" className="h-24 w-24 object-contain" />
                            ) : (
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-gray-600">
                                        <p className="pl-1">ارفع ملفاً</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleLogoChange} className="hidden" accept="image/*" />
                    </div>

                    <div>
                        <h2 className="text-lg font-medium text-gray-900 mb-2">الموقع ومنطقة التوصيل</h2>
                        {isLocationLoading ? (
                            <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
                                <p>جارٍ تحديد الموقع...</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg w-fit mb-4">
                                    <button type="button" onClick={() => setMapMode('location')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${mapMode === 'location' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600'}`}>تحديد الموقع</button>
                                    <button type="button" onClick={() => setMapMode('delivery_area')} className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${mapMode === 'delivery_area' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600'}`}>رسم منطقة التوصيل</button>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">
                                    {mapMode === 'location' ? 'انقر على الخريطة لتحديد موقع مطعمك.' : 'انقر على الخريطة لرسم حدود منطقة التوصيل. انقر على "مسح" للبدء من جديد.'}
                                </p>
                                <LocationPickerMap 
                                    mode={mapMode}
                                    initialLocation={location ? [location.latitude, location.longitude] : initialMapCenter}
                                    initialArea={deliveryArea.map(p => [p.latitude, p.longitude] as LatLngTuple)}
                                    onLocationChange={(loc) => setLocation({ latitude: loc[0], longitude: loc[1] })}
                                    onAreaChange={(area) => setDeliveryArea(area.map(p => ({ latitude: p[0], longitude: p[1] })))}
                                />
                            </>
                        )}
                    </div>

                    <Button type="submit" isLoading={isSubmitting}>إرسال الطلب</Button>
                </form>
            </div>
        </motion.div>
    );
};

export default ApplyRestaurantPage;