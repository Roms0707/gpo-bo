import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Power } from 'lucide-react';
import type { CoachingConfig } from '../../types/coaching';

interface DraggableTopicItemProps {
  config: CoachingConfig;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

const DraggableTopicItem: React.FC<DraggableTopicItemProps> = ({
  config,
  onToggle,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-dark-200 rounded-lg border border-dark-100 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      } ${!config.is_active ? 'opacity-60' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 focus:outline-none"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            config.is_active ? 'text-white' : 'text-gray-500'
          }`}
        >
          {config.config_value}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(config.id, !config.is_active)}
          className={`p-1.5 rounded-md transition-colors ${
            config.is_active
              ? 'text-success-400 hover:bg-success-500/10'
              : 'text-gray-500 hover:bg-gray-500/10'
          }`}
          title={config.is_active ? 'Disable' : 'Enable'}
        >
          <Power className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(config.id)}
          className="p-1.5 rounded-md text-gray-500 hover:text-error-400 hover:bg-error-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DraggableTopicItem;
