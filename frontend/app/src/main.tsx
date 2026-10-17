import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// تسجيل الـ Service Worker لتفعيل PWA فائق السرعة
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const swUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}sw.js`;
    
    navigator.serviceWorker.register(swUrl)
      .then((registration) => {
        console.log('🚀 [PWA] Khsa Aljou Service Worker active with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('⚠️ [PWA] Service Worker registration notice:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
