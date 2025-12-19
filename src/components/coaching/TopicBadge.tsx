import React from 'react';

interface TopicBadgeProps {
  topic: string;
  count?: number;
  className?: string;
}

const TopicBadge: React.FC<TopicBadgeProps> = ({ topic, count, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20 ${className}`}
    >
      <span className="truncate max-w-[150px]">{topic}</span>
      {count !== undefined && (
        <span className="bg-primary-500/20 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
          {count}
        </span>
      )}
    </span>
  );
};

export default TopicBadge;
