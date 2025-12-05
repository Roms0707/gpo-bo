import React, { useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical, ChevronRight, Crown, Users, MoveVertical } from 'lucide-react';
import HighlightText from './HighlightText';

interface DraggableParticipantProps {
  participantId: string | null;
  participantName: string;
  participantSeed: number | null;
  participantElo: number | null;
  participantMemberCount: number | null;
  isWinner: boolean;
  canDrag: boolean;
  canDrop: boolean;
  matchId: string;
  position: 'player1' | 'player2';
  onParticipantClick?: (participantId: string | null) => void;
  canSelect: boolean;
  clickTitle?: string;
  searchQuery?: string;
}

const DraggableParticipant: React.FC<DraggableParticipantProps> = ({
  participantId,
  participantName,
  participantSeed,
  participantElo,
  participantMemberCount,
  isWinner,
  canDrag,
  canDrop,
  matchId,
  position,
  onParticipantClick,
  canSelect,
  clickTitle,
  searchQuery = ''
}) => {
  const dragId = `${matchId}-${position}`;
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      matchId,
      position,
      participantId,
      participantName
    },
    disabled: !canDrag || !participantId
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: dragId,
    data: {
      matchId,
      position
    },
    disabled: !canDrop
  });

  const setRefs = (element: HTMLDivElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  const getClassNames = () => {
    const baseClasses = 'flex items-center justify-between p-2 rounded-lg text-sm transition-all duration-200 relative';

    if (isWinner) {
      return `${baseClasses} bg-success-900/30 border-2 border-success-500/50`;
    }

    if (isDragging) {
      return `${baseClasses} opacity-30 border-2 border-primary-500 bg-primary-500/20 shadow-2xl scale-105`;
    }

    if (isOver && canDrop) {
      return `${baseClasses} bg-success-500/30 border-4 border-success-400 scale-110 shadow-xl animate-pulse`;
    }

    if (canDrag && participantId) {
      return `${baseClasses} hover:bg-primary-800/40 cursor-grab active:cursor-grabbing border-2 ${isHovered ? 'border-primary-400 bg-primary-900/30 shadow-lg' : 'border-gray-600 hover:border-primary-500/50'}`;
    }

    if (canSelect && participantId) {
      return `${baseClasses} hover:bg-primary-900/20 cursor-pointer border-2 border-transparent hover:border-primary-500/30`;
    }

    return `${baseClasses} border-2 border-transparent`;
  };

  const handleClick = () => {
    if (onParticipantClick && (canSelect || (isWinner && clickTitle))) {
      onParticipantClick(participantId);
    }
  };

  return (
    <div
      ref={setRefs}
      {...(canDrag && participantId ? attributes : {})}
      {...(canDrag && participantId ? listeners : {})}
      className={getClassNames()}
      onClick={handleClick}
      onMouseEnter={() => canDrag && participantId && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={clickTitle}
    >
      {/* Drag indicator overlay */}
      {canDrag && participantId && isHovered && (
        <div className="absolute -top-2 -right-2 bg-primary-500 text-white rounded-full p-1 shadow-lg animate-bounce z-10">
          <MoveVertical className="h-3 w-3" />
        </div>
      )}

      <div className="flex items-center space-x-2 min-w-0 flex-1">
        {canDrag && participantId && (
          <div className={`transition-all duration-200 ${isHovered ? 'scale-125 text-primary-400' : 'text-gray-400'}`}>
            <GripVertical className="h-4 w-4 flex-shrink-0" />
          </div>
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center space-x-1">
            {participantSeed && participantSeed <= 4 && (
              <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
            )}
            <span className={`font-medium truncate ${
              participantId ? 'text-white' : 'text-gray-500'
            } ${canSelect && participantId ? 'hover:text-primary-300' : ''}`}>
              {participantSeed && participantId && `#${participantSeed} `}
              <HighlightText
                text={participantName.length > 12 ? participantName.substring(0, 12) + '...' : participantName}
                searchQuery={searchQuery}
              />
            </span>
            {isWinner && (
              <ChevronRight className="h-3 w-3 text-success-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            {participantElo && (
              <span>{participantElo}</span>
            )}
            {participantMemberCount && (
              <span className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {participantMemberCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableParticipant;
