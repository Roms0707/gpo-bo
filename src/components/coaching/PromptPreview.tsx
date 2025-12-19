import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';
import toast from 'react-hot-toast';

interface PromptPreviewProps {
  content: string;
}

const PromptPreview: React.FC<PromptPreviewProps> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="bg-dark-300 rounded-lg border border-dark-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-dark-200 border-b border-dark-100">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-primary-400" />
          <span className="text-sm font-medium text-white">System Prompt Preview</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-dark-300 hover:bg-dark-100 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="p-4 max-h-[400px] overflow-y-auto">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
          {content || 'No active configurations to preview.'}
        </pre>
      </div>
    </div>
  );
};

export default PromptPreview;
