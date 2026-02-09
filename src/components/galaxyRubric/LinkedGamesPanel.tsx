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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, AlertTriangle, Gamepad2 } from 'lucide-react';
import { Game } from '../../types/galaxyRubricMapping';
import { LinkedGame } from '../../services/projectConfigGamesService';
import Badge from '../ui/Badge';
import ConfirmationModal from '../ui/ConfirmationModal';

interface LinkedGamesPanelProps {
  linkedGames: LinkedGame[];
  selectedGameId: string | null;
  onSelectGame: (game: Game) => void;
  onUnlinkGame: (linkId: string, gameId: string, mappingCount: number) => Promise<void>;
  onReorder: (reorderedGames: LinkedGame[]) => void;
}

interface SortableGameCardProps {
  linkedGame: LinkedGame;
  isSelected: boolean;
  onSelect: () => void;
  onUnlink: () => void;
}

const SortableGameCard: React.FC<SortableGameCardProps> = ({
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
      className={`group relative rounded-lg border-2 transition-all overflow-hidden ${
        isDragging ? 'opacity-50 shadow-xl z-10' : ''
      } ${
        isSelected
          ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/10'
          : hasNoRubrics
          ? 'border-warning-500/30 bg-dark-400 hover:border-warning-500/50'
          : 'border-dark-200 bg-dark-400 hover:border-dark-100'
      }`}
    >
      <div className="absolute top-1 left-1 right-1 flex items-center justify-between z-10">
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 bg-dark-400/80 rounded"
        >
          <GripVertical size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnlink();
          }}
          className="p-1 text-gray-500 hover:text-error-400 bg-dark-400/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>

      <button onClick={onSelect} className="w-full text-left">
        <div className="w-full h-16 bg-dark-200 flex items-center justify-center overflow-hidden">
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
            <Gamepad2 className="h-6 w-6 text-gray-600" />
          )}
        </div>
        <div className="p-2 space-y-1">
          <p className="text-xs font-medium text-white truncate">{game.name}</p>
          <div className="flex items-center gap-1">
            {hasNoRubrics ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-warning-400">
                <AlertTriangle size={10} />
                No rubrics
              </span>
            ) : (
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                {mappingCount} rubric{mappingCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </button>

      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
      )}
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
      <div className="text-center py-8 text-gray-500">
        <Gamepad2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No games linked yet</p>
        <p className="text-xs mt-1">Add games from the carousel above</p>
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
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {linkedGames.map((linkedGame) => (
              <SortableGameCard
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
