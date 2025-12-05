import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'active' | 'past';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  children,
  className = '',
  variant = 'default'
}, ref) => {
  const baseStyles = 'rounded-lg border bg-card text-card-foreground shadow transition-all duration-200 hover:shadow-md';

  const variants = {
    default: 'border-gray-200 dark:border-dark-200 bg-white dark:bg-dark-300',
    active: 'border-accent-500 dark:border-accent-500 bg-white dark:bg-dark-300 shadow-glow-accent',
    past: 'border-gray-200 dark:border-dark-300 bg-gray-50 dark:bg-dark-400',
  };

  return (
    <div ref={ref} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <h3 className={`font-semibold text-lg text-gray-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
};

export default Card;