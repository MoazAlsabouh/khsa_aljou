// أيقونات SVG للمنصات المختلفة
const GoogleIcon = () => <svg viewBox="0 0 48 48" className="w-5 h-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.49,44,30.651,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>;
const FacebookIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M22,12c0-5.52-4.48-10-10-10S2,6.48,2,12c0,4.84,3.44,8.87,8,9.8V15H8v-3h2V9.5C10,7.57,11.57,6,13.5,6H16v3h-1.5 c-1,0-1.5,0.5-1.5,1.5V12h3l-0.5,3h-2.5v6.8C18.56,20.87,22,16.84,22,12z"></path></svg>;
const GithubIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12,2C6.48,2,2,6.48,2,12c0,4.42,2.87,8.17,6.84,9.5c0.5,0.09,0.68-0.22,0.68-0.48 c0-0.24-0.01-0.88-0.01-1.72c-2.78,0.6-3.37-1.34-3.37-1.34c-0.45-1.15-1.11-1.46-1.11-1.46c-0.91-0.62,0.07-0.6,0.07-0.6 c1,0.07,1.53,1.03,1.53,1.03c0.89,1.53,2.34,1.09,2.91,0.83c0.09-0.65,0.35-1.09,0.63-1.34C7.99,14.6,5.3,13.6,5.3,9.75 c0-1.09,0.39-1.98,1.03-2.68C6.25,6.88,5.9,6.13,6.4,5.15c0,0,0.86-0.27,2.8,1.02C10.02,6,11.02,5.88,12,5.88 s1.98,0.12,2.77,0.32c1.94-1.29,2.8-1.02,2.8-1.02c0.5,0.98,0.15,1.73,0.07,1.92c0.64,0.7,1.03,1.59,1.03,2.68 c0,3.87-2.69,4.84-5.31,5.13c0.36,0.31,0.68,0.92,0.68,1.85c0,1.34-0.01,2.42-0.01,2.74c0,0.27,0.18,0.58,0.69,0.48 C19.13,20.17,22,16.42,22,12C22,6.48,17.52,2,12,2z"></path></svg>;

const API_BASE_URL = 'http://localhost:5000/api/v1';

const SocialLogins = () => {
  const handleSocialLogin = (provider: 'google' | 'facebook' | 'github') => {
    window.location.href = `${API_BASE_URL}/auth/oauth/login/${provider}`;
  };

  return (
    <div>
      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">أو عبر</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <button
          onClick={() => handleSocialLogin('google')}
          className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
        >
          <GoogleIcon />
        </button>
        <button
          onClick={() => handleSocialLogin('facebook')}
          className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
        >
          <FacebookIcon />
        </button>
        <button
          onClick={() => handleSocialLogin('github')}
          className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
        >
          <GithubIcon />
        </button>
      </div>
    </div>
  );
};

export default SocialLogins;
