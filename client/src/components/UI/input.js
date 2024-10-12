import React from 'react';
import { useTheme } from '../ThemeContext';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  const { theme } = useTheme();

  const isDateInput = type === 'date';

  return (
    <input
      type={type}
      className={`w-full px-3 py-2 rounded-md transition-colors duration-200 ease-in-out
        ${isDateInput
          ? theme.name === 'dark'
            ? 'bg-gray-700 text-white border-gray-600 focus:border-gray-400 placeholder-gray-400'
            : 'bg-gray-200 text-gray-900 border-gray-300 focus:border-blue-500 placeholder-gray-600'
          : theme.name === 'dark'
            ? `bg-${theme.background} text-white border-gray-600 focus:border-gray-400 placeholder-gray-500`
            : `bg-${theme.background} text-gray-900 border-gray-300 focus:border-blue-500 placeholder-gray-400`
        }
        border focus:outline-none focus:ring-2 
        ${theme.name === 'dark' ? 'focus:ring-gray-400' : 'focus:ring-blue-500'}
        ${className}`}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };