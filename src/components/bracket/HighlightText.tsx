import React from 'react';

interface HighlightTextProps {
  text: string;
  searchQuery: string;
  className?: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, searchQuery, className = '' }) => {
  if (!searchQuery || !text) {
    return <span className={className}>{text}</span>;
  }

  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.toLowerCase() === searchQuery.toLowerCase()) {
          return (
            <mark
              key={index}
              className="bg-yellow-400/90 text-yellow-900 dark:text-yellow-950 font-semibold px-1 py-0.5 rounded shadow-sm ring-1 ring-yellow-500/50"
            >
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default HighlightText;
