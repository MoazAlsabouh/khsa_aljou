import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AlertType = 'error' | 'warning' | 'info' | 'success';

interface ModernAlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

const typeStyles = {
  error: {
    container: 'bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 border-rose-200/90 text-rose-900',
    iconBg: 'bg-rose-100/90 text-rose-600 ring-4 ring-rose-50',
    badge: 'bg-rose-600',
    defaultTitle: 'تنبيه',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  warning: {
    container: 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-amber-200/90 text-amber-900',
    iconBg: 'bg-amber-100/90 text-amber-600 ring-4 ring-amber-50',
    badge: 'bg-amber-600',
    defaultTitle: 'تحذير',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    container: 'bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-blue-200/90 text-blue-900',
    iconBg: 'bg-blue-100/90 text-blue-600 ring-4 ring-blue-50',
    badge: 'bg-blue-600',
    defaultTitle: 'معلومة',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    container: 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border-emerald-200/90 text-emerald-900',
    iconBg: 'bg-emerald-100/90 text-emerald-600 ring-4 ring-emerald-50',
    badge: 'bg-emerald-600',
    defaultTitle: 'نجاح',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const ModernAlert: React.FC<ModernAlertProps> = ({
  type = 'error',
  title,
  message,
  onClose,
  actionText,
  onAction,
  className = '',
}) => {
  const currentStyle = typeStyles[type];

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        initial={{ opacity: 0, y: -10, scale: 0.97 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          x: [0, -6, 6, -4, 4, 0],
        }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{
          duration: 0.4,
          ease: 'easeOut',
          x: { duration: 0.45, ease: 'easeInOut' },
        }}
        className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all ${currentStyle.container} ${className}`}
        dir="rtl"
      >
        {/* شريط الإضاءة الجمالي في أعلى البطاقة */}
        <div className={`absolute top-0 right-0 left-0 h-1 ${currentStyle.badge} opacity-80`} />

        <div className="flex items-start gap-3 pt-1">
          {/* أيقونة الحالة العصرية */}
          <div className={`flex-shrink-0 p-2 rounded-xl ${currentStyle.iconBg}`}>
            {currentStyle.icon}
          </div>

          {/* محتوى الرسالة */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold tracking-tight mb-1">
              {title || currentStyle.defaultTitle}
            </h4>
            <p className="text-xs sm:text-sm font-medium opacity-90 leading-relaxed">
              {message}
            </p>

            {actionText && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="mt-2 text-xs font-bold underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                {actionText}
              </button>
            )}
          </div>

          {/* زر الإغلاق العصري */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-400"
              aria-label="إغلاق التنبيه"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModernAlert;
