import { z } from 'zod';

// مخطط التحقق لنموذج تسجيل الدخول
export const loginSchema = z.object({
  identifier: z.string().min(1, { message: 'البريد الإلكتروني أو رقم الهاتف مطلوب' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
});

// مخطط التحقق لنموذج التسجيل الجديد
export const registerSchema = z.object({
    name: z.string().min(1, { message: 'الاسم مطلوب' }), // تمت الإضافة
    email: z.string().email({ message: 'صيغة البريد الإلكتروني غير صحيحة' }),
    phone_number: z.string().min(10, { message: 'رقم الهاتف غير صالح' }),
    password: z.string().min(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
});

// مخطط التحقق لنموذج طلب إعادة تعيين كلمة المرور
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'صيغة البريد الإلكتروني غير صحيحة' }),
});

// (جديد) مخطط التحقق لنموذج تأكيد البريد الإلكتروني
export const verifyEmailSchema = z.object({
  email: z.string().email({ message: 'صيغة البريد الإلكتروني غير صحيحة' }),
  code: z.string().min(1, { message: 'رمز التحقق مطلوب' }),
});

// (مُعدَّل) مخطط التحقق لنموذج تعيين كلمة المرور الجديدة
export const resetPasswordSchema = z.object({
    email: z.string().email({ message: 'صيغة البريد الإلكتروني غير صحيحة' }),
    code: z.string().min(1, { message: 'رمز إعادة التعيين مطلوب' }),
    new_password: z.string().min(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
    confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirm_password"],
});

// مخطط التحقق لرمز OTP
export const otpSchema = z.object({
  otp: z.string().length(6, { message: 'يجب أن يتكون الرمز من 6 أرقام' }).regex(/^\d{6}$/, { message: 'الرمز يجب أن يحتوي على أرقام فقط' }),
});

// مخطط التحقق لتحديث الملف الشخصي
export const updateProfileSchema = z.object({
  name: z.string().min(1, { message: 'الاسم مطلوب' }).optional(),
  profile_image_url: z.string().url({ message: 'يجب أن يكون رابطاً صالحاً' }).or(z.literal('')).optional(),
  email: z.string().email({ message: 'صيغة البريد الإلكتروني غير صحيحة' }),
  phone_number: z.string().min(10, { message: 'رقم الهاتف غير صالح' }),
  old_password: z.string().optional(),
  new_password: z.string().optional(),
  confirm_new_password: z.string().optional(),
}).refine(data => {
  if (data.new_password && !data.old_password) return false;
  return true;
}, {
  message: "يجب إدخال كلمة المرور القديمة لتغييرها",
  path: ["old_password"],
}).refine(data => {
  if (data.new_password && data.new_password.length < 8) return false;
  return true;
}, {
  message: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
  path: ["new_password"],
}).refine(data => {
  if (data.new_password !== data.confirm_new_password) return false;
  return true;
}, {
  message: "كلمتا المرور الجديدتان غير متطابقتين",
  path: ["confirm_new_password"],
});

// مخطط التحقق لنموذج عنصر القائمة
export const menuItemSchema = z.object({
  name: z.string().min(1, { message: 'اسم الوجبة مطلوب' }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'يجب أن يكون السعر رقماً موجباً' }),
  is_available: z.boolean(),
  removable_ingredients: z.string().optional(),
});

// مخطط التحقق لنموذج تقييم الطلب
export const ratingSchema = z.object({
  restaurant_rating: z.coerce.number().min(1, { message: 'التقييم مطلوب' }).max(5),
  comment: z.string().optional(),
});

// مخطط التحقق لنموذج إعدادات المطعم
export const restaurantSettingsSchema = z.object({
  name: z.string().min(1, { message: 'اسم المطعم مطلوب' }),
  description: z.string().optional(),
  logo_url: z.string().url({ message: 'يجب أن يكون رابطاً صالحاً' }).or(z.literal('')).optional(),
  address: z.string().min(1, { message: 'العنوان مطلوب' }),
});

// (جديد) مخطط التحقق لنموذج تغيير كلمة المرور
export const changePasswordSchema = z.object({
    old_password: z.string().min(1, { message: 'كلمة المرور القديمة مطلوبة' }),
    new_password: z.string().min(8, { message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }),
    confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
    message: "كلمتا المرور الجديدتان غير متطابقتين",
    path: ["confirm_password"],
});

// (جديد) مخطط التحقق لنموذج طلب إنشاء مطعم
export const applyRestaurantSchema = z.object({
    restaurant_name: z.string().min(1, { message: "اسم المطعم مطلوب" }),
    description: z.string().min(10, { message: "الوصف يجب أن يكون 10 أحرف على الأقل" }),
    address: z.string().min(1, { message: "العنوان مطلوب" }),
});

// (جديد) مخطط التحقق لنموذج العنوان
export const addressSchema = z.object({
  name: z.string().min(1, { message: "اسم العنوان مطلوب (مثال: المنزل، العمل)" }),
  address_line: z.string().optional(),
  // سيتم التعامل مع الموقع بشكل منفصل
});

// استنتاج أنواع TypeScript من المخططات
export type LoginFormInputs = z.infer<typeof loginSchema>;
export type RegisterFormInputs = z.infer<typeof registerSchema>;
export type ForgotPasswordFormInputs = z.infer<typeof forgotPasswordSchema>;
export type VerifyEmailFormInputs = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordFormInputs = z.infer<typeof resetPasswordSchema>;
export type OtpFormInputs = z.infer<typeof otpSchema>;
export type UpdateProfileFormInputs = z.infer<typeof updateProfileSchema>;
export type MenuItemFormInputs = z.infer<typeof menuItemSchema>;
export type RatingFormInputs = z.infer<typeof ratingSchema>;
export type RestaurantSettingsFormInputs = z.infer<typeof restaurantSettingsSchema>;
export type ChangePasswordFormInputs = z.infer<typeof changePasswordSchema>;
export type ApplyRestaurantFormInputs = z.infer<typeof applyRestaurantSchema>;
export type AddressFormInputs = z.infer<typeof addressSchema>;