import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // التحقق مما إذا كان التطبيق مثبتاً بالفعل في وضع standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // التطبيق مثبت بالفعل، لا داعي لإظهار التثبيت
    }

    // التحقق إذا كان المستخدم أغلق البانر مؤخراً
    const dismissedAt = localStorage.getItem('pwa_banner_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 1000 * 60 * 60 * 24 * 3) {
      // تم إغلاقه خلال آخر 3 أيام
      return;
    }

    // كشف أجهزة iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // إظهار بانر مخصص لـ iOS بعد 4 ثوانٍ
      const timer = setTimeout(() => setShowBanner(true), 4000);
      return () => clearTimeout(timer);
    }

    // الاستماع لحدث قبل التثبيت في المتصفحات الأخرى (Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 right-4 left-4 sm:right-auto sm:left-4 sm:max-w-md z-50 bg-white/95 backdrop-blur-xl border border-red-100 shadow-2xl rounded-2xl p-4 flex items-center gap-3.5"
          dir="rtl"
        >
          {/* أيقونة التطبيق العصرية */}
          <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-red-500/20">
            خ
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>

          {/* محتوى النص */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 leading-tight">
              تثبيت تطبيق خسى الجوع
            </h4>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              تصفح فوري، تتبع الطلبات بدون متجر تطبيقات!
            </p>
          </div>

          {/* أزرار الإجراء */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition-transform active:scale-95"
            >
              تثبيت
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="إغلاق"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* نافذة إرشاد مستخدمي iPhone / iPad */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
              dir="rtl"
            >
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                📲
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                تثبيت على الآيفون والآيباد
              </h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                1. اضغط على زر المشاركة <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-blue-600 font-bold">⎋</span> أسفل متصفح Safari.<br />
                2. اختر من القائمة <span className="font-bold text-gray-800">"إضافة إلى الشاشة الرئيسية ➕"</span>.<br />
                3. اضغط <span className="font-bold text-red-600">"إضافة"</span> في أعلى اليمين.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors"
              >
                فهمت ذلك
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstallBanner;
