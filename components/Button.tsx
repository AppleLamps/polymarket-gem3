import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50";
  
  const variants = {
    // Light: Black bg, White text. Dark: Blue bg, White text
    primary: "bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white shadow-lg shadow-neutral-900/10 dark:shadow-blue-600/20 border border-transparent",
    
    // Light: White bg, Gray text, Border. Dark: Slate bg
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 shadow-sm",
    
    // Transparent outline
    outline: "bg-transparent border border-gray-300 text-gray-600 hover:text-neutral-900 hover:border-neutral-900 dark:border-slate-600 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-400",
    
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;