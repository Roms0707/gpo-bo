import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

  const variants = {
    default: 'bg-gray-100 dark:bg-dark-200 text-gray-800 dark:text-gray-300',
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300',
    secondary: 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-300',
    accent: 'bg-accent-100 dark:bg-accent-900/30 text-accent-800 dark:text-accent-300',
    success: 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300',
    warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300',
    error: 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
