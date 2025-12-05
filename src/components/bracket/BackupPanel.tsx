import React from 'react';
import { Shield, Users } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import DraggableBackupPlayer from './DraggableBackupPlayer';
import { Player, Team } from './types';

interface BackupPanelProps {
  backupPlayers: Player[];
  backupTeams: Team[];
  isTeamTournament: boolean;
  show: boolean;
}

const BackupPanel: React.FC<BackupPanelProps> = ({
  backupPlayers,
  backupTeams,
  isTeamTournament,
  show
}) => {
  if (!show) {
    return null;
  }

  const backups = isTeamTournament ? backupTeams : backupPlayers;
  const hasBackups = backups.length > 0;

  return (
    <div className="w-80 flex-shrink-0 ml-4">
      <Card className="sticky top-4 bg-gradient-to-b from-blue-900/30 to-dark-100 border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="text-blue-100">Backup Players</span>
            </div>
            <div className="flex items-center space-x-1 bg-blue-500/20 px-2 py-1 rounded text-xs text-blue-300 border border-blue-500/30">
              <Users className="h-3 w-3" />
              <span className="font-bold">{backups.length}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasBackups ? (
            <>
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-200 leading-relaxed">
                  <span className="font-semibold block mb-1">How to use backup players:</span>
                  • Drag a backup player to an empty position in a Round 1 match
                  <br />
                  • Or drag to replace an existing player
                  <br />
                  • The replaced player will be removed permanently
                </p>
              </div>

              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                {backups.map((backup) => (
                  <DraggableBackupPlayer
                    key={backup.id}
                    participantId={isTeamTournament ? (backup as Team).captain_id || backup.id : backup.id}
                    participantName={backup.name}
                    participantSeed={backup.seed || null}
                    participantElo={isTeamTournament ? null : (backup as Player).elo || null}
                    participantMemberCount={isTeamTournament ? (backup as Team).memberCount || null : null}
                    isTeam={isTeamTournament}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-500 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-gray-400">No backup players available</p>
              <p className="text-xs text-gray-500 mt-1">
                Backup players can be added through tournament registrations
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </div>
  );
};

export default BackupPanel;
