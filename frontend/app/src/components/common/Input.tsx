import React, { forwardRef } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ type = 'text', label, name, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <input
          id={name}
          name={name}
          type={type}
          ref={ref}
          className={`block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

export default Input;