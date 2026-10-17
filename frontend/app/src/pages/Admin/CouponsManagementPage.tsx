import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import type { Coupon } from '../../types';
import Button from '../../components/common/Button';

const CouponsManagementPage = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // حقول نموذج إنشاء كوبون جديد
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/coupons/');
      setCoupons(res.data);
    } catch (err) {
      toast.error('فشل في جلب قائمة الكوبونات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) {
      toast.error('يرجى إدخال كود الخصم وقيمة الخصم');
      return;
    }

    setIsCreating(true);
    try {
      await axiosClient.post('/coupons/', {
        code: code.trim().toUpperCase(),
        description,
        discount_type: discountType,
        discount_value: parseInt(discountValue, 10),
        min_order_amount: parseInt(minOrderAmount || '0', 10),
        max_discount_amount: maxDiscountAmount ? parseInt(maxDiscountAmount, 10) : null,
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
      });
      toast.success('تم إنشاء الكوبون الترويجي بنجاح! 🎉');
      setCode('');
      setDescription('');
      setDiscountValue('');
      setMinOrderAmount('0');
      setMaxDiscountAmount('');
      setUsageLimit('');
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل في إنشاء الكوبون');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (couponId: number) => {
    try {
      await axiosClient.put(`/coupons/${couponId}/toggle`);
      toast.success('تم تحديث حالة الكوبون');
      fetchCoupons();
    } catch (err) {
      toast.error('فشل في تحديث حالة الكوبون');
    }
  };

  const handleDelete = async (couponId: number) => {
    try {
      await axiosClient.delete(`/coupons/${couponId}`);
      toast.success('تم حذف الكوبون بنجاح');
      fetchCoupons();
    } catch (err) {
      toast.error('فشل في حذف الكوبون');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎟️ إدارة الكوبونات والعروض الترويجية</h1>
        <p className="text-gray-600 mt-1">
          أنشئ أكواد خصم نسبية أو مبالغ ثابتة بالعملة السورية الجديدة لجذب المستخدمين على طريقة جيتير.
        </p>
      </div>

      {/* نموذج إنشاء كوبون جديد */}
      <form
        onSubmit={handleCreateCoupon}
        className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 space-y-4"
      >
        <h2 className="text-xl font-bold text-indigo-900">➕ إضافة كود خصم جديد</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كود الكوبون *</label>
            <input
              type="text"
              placeholder="مثال: SYRIA2026"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full p-2 border rounded-lg uppercase font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخصم *</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
              className="w-full p-2 border rounded-lg"
            >
              <option value="percentage">نسبة مئوية (%)</option>
              <option value="fixed">مبلغ ثابت (ل.س)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              قيمة الخصم ({discountType === 'percentage' ? '%' : 'ل.س'}) *
            </label>
            <input
              type="number"
              min="1"
              placeholder={discountType === 'percentage' ? 'مثال: 20' : 'مثال: 50'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحد الأدنى للطلب (ل.س)
            </label>
            <input
              type="number"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {discountType === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الحد الأقصى للخصم (ل.س - اختياري)
              </label>
              <input
                type="number"
                min="1"
                placeholder="مثال: 200"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحد الأقصى لعدد مرات الاستخدام (اختياري)
            </label>
            <input
              type="number"
              min="1"
              placeholder="مثال: 100"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              وصف العرض الترويجي
            </label>
            <input
              type="text"
              placeholder="مثال: خصم 20% بمناسبة نهاية الأسبوع على كافة الطلبات"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" isLoading={isCreating} className="w-full sm:w-auto px-8">
            إنشاء وتفعيل الكوبون
          </Button>
        </div>
      </form>

      {/* قائمة الكوبونات الحالية */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-800">قائمة الكوبونات الحالية ({coupons.length})</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">جاري تحميل الكوبونات...</div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد كوبونات مضافة حالياً.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-right">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">الكود</th>
                  <th className="px-6 py-3">الوصف</th>
                  <th className="px-6 py-3">قيمة الخصم</th>
                  <th className="px-6 py-3">الحد الأدنى للطلب</th>
                  <th className="px-6 py-3">مرات الاستخدام</th>
                  <th className="px-6 py-3">الحالة</th>
                  <th className="px-6 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-extrabold text-indigo-700">{c.code}</td>
                    <td className="px-6 py-4 text-gray-600">{c.description || '-'}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      {c.discount_type === 'percentage'
                        ? `${c.discount_value}% ${
                            c.max_discount_amount ? `(حتى ${c.max_discount_amount} ل.س)` : ''
                          }`
                        : `${c.discount_value.toLocaleString('ar-SY')} ل.س`}
                    </td>
                    <td className="px-6 py-4">
                      {c.min_order_amount.toLocaleString('ar-SY')} ل.س
                    </td>
                    <td className="px-6 py-4">
                      {c.used_count} {c.usage_limit ? `/ ${c.usage_limit}` : '(غير محدود)'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {c.is_active ? 'مفعل' : 'متوقف'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c.id)}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        {c.is_active ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-red-600 hover:text-red-900 font-semibold"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CouponsManagementPage;
