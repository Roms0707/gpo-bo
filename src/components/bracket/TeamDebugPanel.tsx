import React, { useState } from 'react';
import { AlertTriangle, Check, X, User, Users, Database, ChevronDown, ChevronUp } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Team, Player } from './types';
import Button from '../ui/Button';

interface TeamDebugPanelProps {
  show: boolean;
  tournament: any;
  allTeams?: Team[];
  approvedTeams?: Team[];
  players?: Player[];
  sqlQuery?: string;
  registrationsCount?: number;
  validRegistrationsCount?: number;
}

const TeamDebugPanel: React.FC<TeamDebugPanelProps> = ({
  show,
  tournament,
  allTeams = [],
  approvedTeams = [],
  players = [],
  sqlQuery = '',
  registrationsCount = 0,
  validRegistrationsCount = 0
}) => {
  const [showSqlQuery, setShowSqlQuery] = useState(true);
  
  if (!show) return null;

  // For team tournaments
  if (tournament?.type === 'team') {
    return (
      <Card className="mb-4 bg-dark-300 border-yellow-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-yellow-400 text-base">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Team Approval Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-300 mb-2">
            <p>Required team size: <span className="font-mono">{tournament.max_players_per_team || 5}</span> members</p>
            <p>Total teams: <span className="font-mono">{allTeams.length}</span>, Approved teams: <span className="font-mono">{approvedTeams.length}</span></p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-dark-200">
                  <th className="p-2 text-left border border-dark-100">Team Name</th>
                  <th className="p-2 text-center border border-dark-100">Captain Approved</th>
                  <th className="p-2 text-center border border-dark-100">Member Count</th>
                  <th className="p-2 text-center border border-dark-100">Required Members</th>
                  <th className="p-2 text-center border border-dark-100">Has Enough Members</th>
                  <th className="p-2 text-center border border-dark-100">Final Status</th>
                </tr>
              </thead>
              <tbody>
                {allTeams.map(team => (
                  <tr key={team.id} className={team.isApproved ? "bg-success-900/20" : "bg-error-900/10"}>
                    <td className="p-2 border border-dark-100">{team.name}</td>
                    <td className="p-2 text-center border border-dark-100">
                      {team.captainApproved ? (
                        <Check size={16} className="inline text-success-500" />
                      ) : (
                        <X size={16} className="inline text-error-500" />
                      )}
                    </td>
                    <td className="p-2 text-center border border-dark-100 font-mono">
                      {team.memberCount || 0}
                    </td>
                    <td className="p-2 text-center border border-dark-100 font-mono">
                      {team.requiredMembers || 5}
                    </td>
                    <td className="p-2 text-center border border-dark-100">
                      {team.hasEnoughMembers ? (
                        <Check size={16} className="inline text-success-500" />
                      ) : (
                        <X size={16} className="inline text-error-500" />
                      )}
                    </td>
                    <td className="p-2 text-center border border-dark-100">
                      {team.isApproved ? (
                        <span className="text-success-500 font-medium">Approved</span>
                      ) : (
                        <span className="text-error-500 font-medium">Not Approved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <p>Team approval criteria: Captain must be approved AND team must have at least the required number of members.</p>
          </div>
          
          {sqlQuery && (
            <div className="mt-4">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowSqlQuery(!showSqlQuery)}
                className="text-xs flex items-center text-yellow-400 mb-2"
              >
                <Database className="h-3 w-3 mr-1" />
                {showSqlQuery ? 'Hide SQL Query' : 'Show SQL Query'}
                {showSqlQuery ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
              
              {showSqlQuery && (
                <div className="bg-dark-400 p-3 rounded-md overflow-x-auto">
                  <pre className="text-xs text-green-400 whitespace-pre-wrap">{sqlQuery}</pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // For solo tournaments
  return (
    <Card className="mb-4 bg-dark-300 border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-yellow-400 text-base">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Player Debug Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-gray-300 mb-2">
          <p>Total approved registrations: <span className="font-mono">{registrationsCount}</span></p>
          <p>Valid player registrations: <span className="font-mono">{validRegistrationsCount}</span></p>
          <p>Players with complete data: <span className="font-mono">{players.length}</span></p>
        </div>
        
        <div className="bg-dark-400 p-3 rounded-md overflow-x-auto mb-4">
          <h4 className="font-semibold text-warning-400 flex items-center mb-2 text-xs">
            <Database className="h-3 w-3 mr-1" />
            SQL Query Used:
          </h4>
          <pre className="text-xs text-green-400 whitespace-pre-wrap">{sqlQuery}</pre>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-dark-200">
                <th className="p-2 text-left border border-dark-100">Seed</th>
                <th className="p-2 text-left border border-dark-100">Player Name</th>
                <th className="p-2 text-center border border-dark-100">ELO Rating</th>
                <th className="p-2 text-center border border-dark-100">Status</th>
              </tr>
            </thead>
            <tbody>
              {players.length > 0 ? (
                players.map((player, index) => (
                  <tr key={player.id} className="bg-success-900/20">
                    <td className="p-2 border border-dark-100">#{player.seed || index + 1}</td>
                    <td className="p-2 border border-dark-100">{player.name}</td>
                    <td className="p-2 text-center border border-dark-100 font-mono">
                      {player.elo || 1000}
                    </td>
                    <td className="p-2 text-center border border-dark-100">
                      <span className="text-success-500 font-medium">Approved</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-2 text-center border border-dark-100 text-error-400">
                    No valid players found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-3 text-xs text-gray-400">
          <p>All players shown have been approved for this tournament.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamDebugPanel;