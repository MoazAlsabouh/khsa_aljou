import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, className, isLoading = false, ...props }) => {
  return (
    <button
      className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading && <Spinner />}
      <span className={isLoading ? 'ml-2' : ''}>
        {isLoading ? 'جار التحميل...' : children}
      </span>
    </button>
  );
};

export default Button;