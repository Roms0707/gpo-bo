import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Shield, Crown, Users, MoveVertical } from 'lucide-react';

interface DraggableBackupPlayerProps {
  participantId: string;
  participantName: string;
  participantSeed: number | null;
  participantElo: number | null;
  participantMemberCount: number | null;
  isTeam: boolean;
}

const DraggableBackupPlayer: React.FC<DraggableBackupPlayerProps> = ({
  participantId,
  participantName,
  participantSeed,
  participantElo,
  participantMemberCount,
  isTeam
}) => {
  const dragId = `backup-${participantId}`;
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      type: 'backup',
      participantId,
      participantName,
      isTeam
    }
  });

  const getClassNames = () => {
    const baseClasses = 'flex items-center justify-between p-3 rounded-lg text-sm transition-all duration-200 relative';

    if (isDragging) {
      return `${baseClasses} opacity-30 border-2 border-blue-500 bg-blue-500/20 shadow-2xl scale-105`;
    }

    return `${baseClasses} hover:bg-blue-800/40 cursor-grab active:cursor-grabbing border-2 ${
      isHovered
        ? 'border-blue-400 bg-blue-900/30 shadow-lg'
        : 'border-blue-600/50 hover:border-blue-500/70 bg-blue-900/20'
    }`;
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={getClassNames()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg animate-bounce z-10">
          <MoveVertical className="h-3 w-3" />
        </div>
      )}

      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <div className={`transition-all duration-200 ${isHovered ? 'scale-125 text-blue-400' : 'text-blue-500'}`}>
          <Shield className="h-4 w-4 flex-shrink-0" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center space-x-1">
            {participantSeed && participantSeed <= 4 && (
              <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
            )}
            <span className="font-medium truncate text-white">
              {participantSeed && `#${participantSeed} `}
              {participantName.length > 15 ? participantName.substring(0, 15) + '...' : participantName}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            {participantElo && (
              <span>{participantElo} ELO</span>
            )}
            {participantMemberCount && (
              <span className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {participantMemberCount}
              </span>
            )}
            <span className="text-blue-400 font-medium">BACKUP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableBackupPlayer;
