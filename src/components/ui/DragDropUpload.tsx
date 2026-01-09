import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, AlertCircle } from 'lucide-react';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  preview: string | null;
  accept?: string;
  maxSizeMB?: number;
  recommendedSize?: string;
  className?: string;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileSelect,
  onRemove,
  preview,
  accept = 'image/*',
  maxSizeMB = 5,
  recommendedSize = '1200x400px',
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): boolean => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, GIF, WebP)');
      return false;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      onFileSelect(file);
    }
  }, [onFileSelect, maxSizeMB]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = () => {
    setFileName(null);
    setFileSize(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove();
  };

  if (preview) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative rounded-xl overflow-hidden border-2 border-dark-200 bg-dark-300">
          <div className="relative aspect-[3/1] w-full">
            <img
              src={preview}
              alt="Header preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-dark-300/80 backdrop-blur-sm rounded-lg">
                    <Image className="w-4 h-4 text-primary-400" />
                  </div>
                  <div>
                    {fileName && (
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">
                        {fileName}
                      </p>
                    )}
                    {fileSize && (
                      <p className="text-xs text-gray-400">{fileSize}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-2 bg-error-500/90 hover:bg-error-500 text-white rounded-lg transition-colors shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="absolute top-3 right-3 px-2 py-1 bg-dark-300/80 backdrop-blur-sm rounded text-xs text-gray-300">
              Recommended: {recommendedSize}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
          ${isDragging
            ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
            : 'border-gray-600 hover:border-gray-500 hover:bg-dark-200/50'
          }
        `}
      >
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className={`
            p-4 rounded-xl mb-4 transition-colors duration-200
            ${isDragging ? 'bg-primary-500/20' : 'bg-dark-200'}
          `}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-primary-400' : 'text-gray-400'}`} />
          </div>

          <p className="text-base font-medium text-white mb-1">
            {isDragging ? 'Drop your image here' : 'Drag and drop your header image'}
          </p>
          <p className="text-sm text-gray-400 mb-3">
            or <span className="text-primary-400 hover:text-primary-300">click to browse</span>
          </p>
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF or WebP up to {maxSizeMB}MB
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Recommended size: {recommendedSize}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="sr-only"
        />
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-error-500/10 border border-error-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-400">{error}</p>
        </div>
      )}
    </div>
  );
};

export default DragDropUpload;
