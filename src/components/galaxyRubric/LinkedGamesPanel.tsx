import React, { useState } from 'react';
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
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, AlertTriangle, Gamepad2 } from 'lucide-react';
import { Game } from '../../types/galaxyRubricMapping';
import { LinkedGame } from '../../services/projectConfigGamesService';
import ConfirmationModal from '../ui/ConfirmationModal';

interface LinkedGamesPanelProps {
  linkedGames: LinkedGame[];
  selectedGameId: string | null;
  onSelectGame: (game: Game) => void;
  onUnlinkGame: (linkId: string, gameId: string, mappingCount: number) => Promise<void>;
  onReorder: (reorderedGames: LinkedGame[]) => void;
}

interface SortableGameRowProps {
  linkedGame: LinkedGame;
  isSelected: boolean;
  onSelect: () => void;
  onUnlink: () => void;
}

const SortableGameRow: React.FC<SortableGameRowProps> = ({
  linkedGame,
  isSelected,
  onSelect,
  onUnlink,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: linkedGame.linkId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { game, mappingCount } = linkedGame;
  const hasNoRubrics = mappingCount === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-3 py-2 transition-all border-l-2 ${
        isDragging ? 'opacity-50 z-10 bg-dark-200' : ''
      } ${
        isSelected
          ? 'border-l-primary-500 bg-primary-500/10'
          : 'border-l-transparent hover:bg-dark-200'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400"
      >
        <GripVertical size={12} />
      </button>

      <button onClick={onSelect} className="flex-1 flex items-center gap-2 min-w-0 text-left">
        <div className="w-7 h-7 flex-shrink-0 bg-dark-200 rounded overflow-hidden flex items-center justify-center">
          {game.image_url ? (
            <img
              src={game.image_url}
              alt={game.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Gamepad2 className="h-3.5 w-3.5 text-gray-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{game.name}</p>
          <div className="flex items-center gap-1">
            {hasNoRubrics ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-warning-400">
                <AlertTriangle size={8} />
                No rubrics
              </span>
            ) : (
              <span className="text-[9px] text-emerald-400 font-medium">
                {mappingCount} rubric{mappingCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onUnlink();
        }}
        className="flex-shrink-0 p-1 text-gray-600 hover:text-error-400 rounded opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={12} />
      </button>
    </div>
  );
};

const LinkedGamesPanel: React.FC<LinkedGamesPanelProps> = ({
  linkedGames,
  selectedGameId,
  onSelectGame,
  onUnlinkGame,
  onReorder,
}) => {
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedGame | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = linkedGames.findIndex((g) => g.linkId === active.id);
    const newIndex = linkedGames.findIndex((g) => g.linkId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(linkedGames, oldIndex, newIndex);
    onReorder(reordered);
  };

  const handleConfirmUnlink = async () => {
    if (!unlinkTarget) return;
    setIsUnlinking(true);
    await onUnlinkGame(
      unlinkTarget.linkId,
      unlinkTarget.game.id,
      unlinkTarget.mappingCount
    );
    setIsUnlinking(false);
    setUnlinkTarget(null);
  };

  if (linkedGames.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <Gamepad2 className="h-8 w-8 mx-auto mb-2 text-gray-600 opacity-50" />
        <p className="text-xs text-gray-500">No games linked</p>
        <p className="text-[10px] text-gray-600 mt-0.5">Use + to add games</p>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={linkedGames.map((g) => g.linkId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="py-1">
            {linkedGames.map((linkedGame) => (
              <SortableGameRow
                key={linkedGame.linkId}
                linkedGame={linkedGame}
                isSelected={selectedGameId === linkedGame.game.id}
                onSelect={() => onSelectGame(linkedGame.game)}
                onUnlink={() => setUnlinkTarget(linkedGame)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <ConfirmationModal
        isOpen={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={handleConfirmUnlink}
        title="Unlink Game"
        message={
          unlinkTarget ? (
            <div>
              <p>
                Are you sure you want to unlink{' '}
                <strong>{unlinkTarget.game.name}</strong>?
              </p>
              {unlinkTarget.mappingCount > 0 && (
                <p className="mt-2 text-warning-400 text-sm">
                  This will also remove {unlinkTarget.mappingCount} rubric
                  mapping{unlinkTarget.mappingCount !== 1 ? 's' : ''} associated
                  with this game.
                </p>
              )}
            </div>
          ) : (
            ''
          )
        }
        confirmText="Unlink"
        isDestructive
        isLoading={isUnlinking}
      />
    </>
  );
};

export default LinkedGamesPanel;
