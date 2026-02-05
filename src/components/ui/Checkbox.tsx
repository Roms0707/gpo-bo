import React, { forwardRef } from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, description, ...props }, ref) => {
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={`
              h-4 w-4 rounded border-gray-300 dark:border-gray-600 
              text-primary-600 dark:text-primary-500
              focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:ring-offset-2 
              focus:ring-offset-white dark:focus:ring-offset-dark-300
              ${className}
            `}
            ref={ref}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="ml-3 text-sm">
            {label && (
              <label
                htmlFor={props.id}
                className="font-medium text-gray-700 dark:text-gray-300"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;