import React, { useState, useEffect } from 'react';
import { Pipette, Copy, Check } from 'lucide-react';

interface ColorPickerInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  helperText?: string;
}

const ColorPickerInput: React.FC<ColorPickerInputProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  helperText,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value.toUpperCase();

    if (!newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }

    newValue = newValue.slice(0, 7);

    setInternalValue(newValue);

    if (/^#[0-9A-F]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInternalValue(newValue);
    onChange(newValue);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(internalValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isValidColor = /^#[0-9A-F]{6}$/.test(internalValue);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={internalValue}
            onChange={handleInputChange}
            placeholder="#FF6B00"
            className={`
              w-full px-3 py-2 pl-12
              bg-white dark:bg-dark-300
              border ${error ? 'border-error-500' : 'border-gray-300 dark:border-dark-200'}
              rounded-lg
              text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary-500
              transition-colors
            `}
            maxLength={7}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: isValidColor ? internalValue : '#cccccc' }}
            />
          </div>
        </div>

        <div className="relative">
          <input
            type="color"
            value={isValidColor ? internalValue : '#cccccc'}
            onChange={handleColorPickerChange}
            className="w-12 h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-dark-200"
            title="Pick a color"
          />
          <Pipette className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none drop-shadow-md" />
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-2 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-100 rounded-lg transition-colors"
          title="Copy hex value"
        >
          {copied ? (
            <Check className="w-5 h-5 text-success-500" />
          ) : (
            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}

      {error && (
        <p className="text-xs text-error-500">{error}</p>
      )}

      {!isValidColor && internalValue.length > 0 && !error && (
        <p className="text-xs text-warning-500">
          Color must be in #RRGGBB format (e.g., #FF6B00)
        </p>
      )}
    </div>
  );
};

export default ColorPickerInput;
