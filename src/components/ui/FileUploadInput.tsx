import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText } from 'lucide-react';

interface FileUploadInputProps {
  label: string;
  accept?: string;
  value?: File | null;
  previewUrl?: string;
  onChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
  helperText?: string;
  maxSizeMB?: number;
}

const FileUploadInput: React.FC<FileUploadInputProps> = ({
  label,
  accept = 'image/*',
  value,
  previewUrl,
  onChange,
  error,
  required = false,
  helperText,
  maxSizeMB = 5,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setLocalPreview(null);
      onChange(null);
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      onChange(null);
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    onChange(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    handleFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const displayPreview = localPreview || previewUrl;
  const hasFile = value || displayPreview;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4
          ${isDragging ? 'border-primary-500 bg-primary-500/10' : error ? 'border-error-500' : 'border-gray-300 dark:border-dark-200'}
          ${hasFile ? '' : 'cursor-pointer hover:border-primary-400 hover:bg-primary-500/5'}
          transition-colors
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={hasFile ? undefined : handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />

        {hasFile ? (
          <div className="space-y-3">
            {displayPreview && (
              <div className="flex justify-center">
                <img
                  src={displayPreview}
                  alt="Preview"
                  className="max-h-32 object-contain rounded"
                />
              </div>
            )}

            {value && (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-200 p-2 rounded">
                <div className="flex items-center gap-2 min-w-0">
                  {value.type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {value.name}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({(value.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-dark-100 rounded transition-colors flex-shrink-0"
                  title="Remove file"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            )}

            {!value && previewUrl && (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-200 p-2 rounded">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Current file
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClick}
                  className="text-sm text-primary-500 hover:text-primary-600"
                >
                  Replace
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {accept.includes('image') ? 'SVG, PNG, JPG or ICO' : accept} (max {maxSizeMB}MB)
            </p>
          </div>
        )}
      </div>

      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}

      {error && (
        <p className="text-xs text-error-500">{error}</p>
      )}
    </div>
  );
};

export default FileUploadInput;
