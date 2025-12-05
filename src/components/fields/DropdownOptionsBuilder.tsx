import React, { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface DropdownOptionsBuilderProps {
  options: string[];
  onChange: (options: string[]) => void;
  label?: string;
}

interface SortableOptionProps {
  id: string;
  index: number;
  option: string;
  onOptionChange: (index: number, value: string) => void;
  onRemoveOption: (index: number) => void;
}

const SortableOption: React.FC<SortableOptionProps> = ({
  id,
  index,
  option,
  onOptionChange,
  onRemoveOption,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-2"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </div>

      <Input
        value={option}
        onChange={(e) => onOptionChange(index, e.target.value)}
        placeholder={`Option ${index + 1}`}
      />

      <button
        type="button"
        onClick={() => onRemoveOption(index)}
        className="flex-shrink-0 p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-md transition-colors"
        title="Remove option"
      >
        <X size={18} />
      </button>
    </div>
  );
};

const DropdownOptionsBuilder: React.FC<DropdownOptionsBuilderProps> = ({
  options,
  onChange,
  label = 'Dropdown Options',
}) => {
  const [newOption, setNewOption] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddOption = () => {
    if (newOption.trim()) {
      onChange([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = options.filter((_, i) => i !== index);
    onChange(updatedOptions);
  };

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    onChange(updatedOptions);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex((_, i) => `option-${i}` === active.id);
      const newIndex = options.findIndex((_, i) => `option-${i}` === over.id);

      const reorderedOptions = arrayMove(options, oldIndex, newIndex);
      onChange(reorderedOptions);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={options.map((_, index) => `option-${index}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {options.map((option, index) => (
              <SortableOption
                key={`option-${index}`}
                id={`option-${index}`}
                index={index}
                option={option}
                onOptionChange={handleOptionChange}
                onRemoveOption={handleRemoveOption}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center space-x-2">
        <Input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add new option..."
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddOption}
          disabled={!newOption.trim()}
          leftIcon={<Plus size={16} />}
        >
          Add
        </Button>
      </div>

      {options.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          No options added yet. Add at least one option for the dropdown.
        </p>
      )}

      {options.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {options.length} option{options.length !== 1 ? 's' : ''} added. Drag to reorder.
        </p>
      )}
    </div>
  );
};

export default DropdownOptionsBuilder;
