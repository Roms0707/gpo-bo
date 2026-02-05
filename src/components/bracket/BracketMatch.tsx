import React, { useState, forwardRef } from 'react';
import { ChevronRight, Crown, Trophy, Users, RotateCcw, Star, Info } from 'lucide-react';
import { Match, Player, Team } from './types';
import ConfirmationModal from '../ui/ConfirmationModal';
import DraggableParticipant from './DraggableParticipant';
import HighlightText from './HighlightText';

interface BracketMatchProps {
  match: Match;
  allMatches?: Match[];
  tournament: any;
  players: Player[];
  teams: Team[];
  onWinnerSelected: (matchId: string, winnerId: string) => void;
  isEditable?: boolean;
  onMatchUpdate?: (matchId: string) => void;
  canModifyResult?: boolean;
  onResetMatch?: (matchId: string) => Promise<boolean>;
  onChangeWinner?: (matchId: string, newWinnerId: string) => Promise<boolean>;
  matchNumber?: number;
  isHighlighted?: boolean;
  searchQuery?: string;
  onPlayerInfoClick?: (participantId: string) => void;
}

type SlotStatus = 'player' | 'bye' | 'tbd' | 'empty';

const BracketMatch = forwardRef<HTMLDivElement, BracketMatchProps>(({
  match,
  allMatches = [],
  tournament,
  players,
  teams,
  onWinnerSelected,
  isEditable = false,
  onMatchUpdate,
  canModifyResult = false,
  onResetMatch,
  onChangeWinner,
  matchNumber,
  isHighlighted = false,
  searchQuery = '',
  onPlayerInfoClick
}, ref) => {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [changeWinnerConfirm, setChangeWinnerConfirm] = useState<{
    newWinnerId: string;
    currentWinnerName: string;
    newWinnerName: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isChangingWinner, setIsChangingWinner] = useState(false);

  const getSlotStatus = (slotId: string | null, slotPosition: 'player1' | 'player2'): SlotStatus => {
    if (slotId) return 'player';

    if (match.round === 1) {
      const hasPlayer1 = match.player1_id !== null;
      const hasPlayer2 = match.player2_id !== null;
      if (hasPlayer1 !== hasPlayer2) return 'bye';
      return 'empty';
    }

    const feederPosition = slotPosition === 'player1'
      ? (match.position * 2) - 1
      : match.position * 2;
    const feederMatch = allMatches.find(
      m => m.round === match.round - 1 && m.position === feederPosition
    );

    if (!feederMatch) {
      return 'tbd';
    }

    if (!feederMatch.winner_id) {
      return 'tbd';
    }

    return 'tbd';
  };

  const getSlotLabel = (status: SlotStatus): string => {
    switch (status) {
      case 'bye': return 'Bye';
      case 'tbd': return 'TBD';
      case 'empty': return '---';
      default: return '';
    }
  };

  const getParticipantName = (participantId: string | null, slotPosition: 'player1' | 'player2') => {
    if (!participantId) {
      const status = getSlotStatus(participantId, slotPosition);
      return getSlotLabel(status);
    }
    
    if (tournament?.type === 'team') {
      // For team tournaments, find team by captain_id
      const team = teams.find(t => t.captain_id === participantId);
      return team ? team.name : 'Unknown Team';
    } else {
      const player = players.find(p => p.id === participantId);
      return player ? player.name : 'Unknown Player';
    }
  };

  const getParticipantElo = (participantId: string | null) => {
    if (!participantId) return null;
    
    if (tournament?.type === 'team') {
      return null; // Teams don't have ELO in this implementation
    } else {
      const player = players.find(p => p.id === participantId);
      return player ? player.elo : null;
    }
  };

  const getParticipantSeed = (participantId: string | null) => {
    if (!participantId) return null;
    
    if (tournament?.type === 'team') {
      // For team tournaments, find team by captain_id
      const team = teams.find(t => t.captain_id === participantId);
      return team ? team.seed : null;
    } else {
      const player = players.find(p => p.id === participantId);
      return player ? player.seed : null;
    }
  };

  const getParticipantMemberCount = (participantId: string | null) => {
    if (!participantId || tournament?.type !== 'team') return null;
    
    // For team tournaments, find team by captain_id
    const team = teams.find(t => t.captain_id === participantId);
    return team ? team.memberCount : null;
  };

  const participant1Name = getParticipantName(match.player1_id, 'player1');
  const participant2Name = getParticipantName(match.player2_id, 'player2');
  const slot1Status = getSlotStatus(match.player1_id, 'player1');
  const slot2Status = getSlotStatus(match.player2_id, 'player2');
  const participant1Elo = getParticipantElo(match.player1_id);
  const participant2Elo = getParticipantElo(match.player2_id);
  const participant1Seed = getParticipantSeed(match.player1_id);
  const participant2Seed = getParticipantSeed(match.player2_id);
  const participant1MemberCount = getParticipantMemberCount(match.player1_id);
  const participant2MemberCount = getParticipantMemberCount(match.player2_id);

  const hasPlayer1 = match.player1_id !== null && match.player1_id !== undefined;
  const hasPlayer2 = match.player2_id !== null && match.player2_id !== undefined;
  const isRound1Bye = match.round === 1 && (hasPlayer1 !== hasPlayer2);
  const isByeMatch = match.is_bye || isRound1Bye;
  const isTbdMatch = slot1Status === 'tbd' || slot2Status === 'tbd';
  const isFirstRoundBye = isRound1Bye;
  const isWaitingForOpponent = match.round > 1 && (hasPlayer1 !== hasPlayer2) && !match.is_bye && !match.winner_id;
  const isLuckyLoserMatch = match.is_lucky_loser_match || false;
  const luckyLoserPlayerId = match.lucky_loser_player_id;
  const canSelectWinner = match.player1_id && match.player2_id && !match.winner_id && !isEditable;
  const canSwapPlayers = isEditable && match.player1_id && match.player2_id && !match.winner_id;

  // Drag & drop conditions - now works for any editable round, not just round 1
  const canDragParticipants = isEditable && !match.winner_id;
  const canDropParticipants = isEditable && !match.winner_id;

  const isAutoAdvanced = isByeMatch && match.winner_id;

  const byeBadgeColor = match.round === 1
    ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : 'bg-orange-500/20 text-orange-400 border-orange-500/30';

  const tbdBadgeColor = 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  const getMatchBorderColor = () => {
    if (isByeMatch) return byeBadgeColor;
    if (isTbdMatch) return tbdBadgeColor;
    return '';
  };

  const handleResetConfirm = async () => {
    if (!onResetMatch) return;

    setIsResetting(true);
    await onResetMatch(match.id);
    setIsResetting(false);
    setResetConfirm(false);
  };

  const handleChangeWinnerConfirm = async () => {
    if (!onChangeWinner || !changeWinnerConfirm) return;

    setIsChangingWinner(true);
    await onChangeWinner(match.id, changeWinnerConfirm.newWinnerId);
    setIsChangingWinner(false);
    setChangeWinnerConfirm(null);
  };

  const getPlayerDisplayName = (participantId: string | null): string => {
    if (!participantId) return 'Unknown';
    if (tournament?.type === 'team') {
      const team = teams.find(t => t.captain_id === participantId);
      return team ? team.name : 'Unknown Team';
    } else {
      const player = players.find(p => p.id === participantId);
      return player ? player.name : 'Unknown Player';
    }
  };

  const handleParticipantClick = (participantId: string | null) => {
    if (!participantId) return;

    if (canSelectWinner) {
      onWinnerSelected(match.id, participantId);
    } else if (match.winner_id && match.winner_id !== participantId && canModifyResult && onChangeWinner) {
      setChangeWinnerConfirm({
        newWinnerId: participantId,
        currentWinnerName: getPlayerDisplayName(match.winner_id),
        newWinnerName: getPlayerDisplayName(participantId)
      });
    }
  };

  const waitingBadgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';

  return (
    <>
      <div
        ref={ref}
        data-match-id={match.id}
        className={`relative p-3 rounded-lg border min-h-[80px] flex flex-col justify-center shadow-lg ${
          isByeMatch
            ? `${byeBadgeColor} border-2`
            : isWaitingForOpponent
              ? `${waitingBadgeColor} border-2`
              : isTbdMatch
                ? `${tbdBadgeColor} border-2`
                : isHighlighted
                  ? 'bg-gray-700 border-primary-500 ring-2 ring-primary-500/20'
                  : 'bg-gray-700 border-gray-600'
        }`}>
        {matchNumber && (
          <div className="absolute -top-2 -left-2 z-10">
            <span className="bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              #{matchNumber}
            </span>
          </div>
        )}

        {isByeMatch && !match.winner_id && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${byeBadgeColor}`}>
              {match.round === 1 ? 'BYE' : 'BYE R' + match.round}
            </span>
          </div>
        )}

        {isWaitingForOpponent && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${waitingBadgeColor}`}>
              Qualified
            </span>
          </div>
        )}

        {isTbdMatch && !isByeMatch && !isWaitingForOpponent && !match.winner_id && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tbdBadgeColor}`}>
              TBD
            </span>
          </div>
        )}

        {/* Lucky Loser Badge - Top Right */}
        {isLuckyLoserMatch && (
          <div className="absolute -top-2 -right-2 z-10">
            <span
              className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg"
              title={match.forfeit_reason || 'Lucky Loser replacement'}
            >
              <Star className="h-3 w-3 fill-purple-300" />
              Lucky Loser
            </span>
          </div>
        )}

        {/* Reset Button - Bottom Left (when match has winner) */}
        {match.winner_id && canModifyResult && onResetMatch && (
          <div className="absolute -bottom-2 -left-2 z-10">
            <button
              onClick={() => setResetConfirm(true)}
              className="bg-error-500 hover:bg-error-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
              title="Reset match result"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Swap Button - Top Right (Draft Mode) */}
        {canSwapPlayers && onMatchUpdate && (
          <div className="absolute -top-2 -right-2 z-10">
            <button
              onClick={() => onMatchUpdate(match.id)}
              className="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
              title="Swap players"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>
        )}

        <div className="space-y-1">
          {/* Participant 1 */}
          {canDragParticipants ? (
            <DraggableParticipant
              participantId={match.player1_id}
              participantName={participant1Name}
              participantSeed={participant1Seed}
              participantElo={participant1Elo}
              participantMemberCount={participant1MemberCount}
              isWinner={match.winner_id === match.player1_id}
              canDrag={canDragParticipants}
              canDrop={canDropParticipants}
              matchId={match.id}
              position="player1"
              onParticipantClick={handleParticipantClick}
              onPlayerInfoClick={onPlayerInfoClick}
              canSelect={canSelectWinner}
              clickTitle={match.winner_id && match.winner_id !== match.player1_id && canModifyResult ? 'Click to change winner' : ''}
              searchQuery={searchQuery}
            />
          ) : (
            <div className={`flex items-center justify-between p-1.5 rounded text-sm transition-all duration-200 ${
              match.winner_id === match.player1_id
                ? 'bg-success-900/30 border border-success-500/50'
                : canSelectWinner && match.player1_id
                  ? 'hover:bg-primary-900/20 cursor-pointer border border-transparent hover:border-primary-500/30'
                  : match.winner_id && canModifyResult && match.player1_id
                  ? 'hover:bg-primary-900/20 cursor-pointer border border-transparent hover:border-primary-500/30'
                  : ''
            }`}
            onClick={() => handleParticipantClick(match.player1_id)}
            title={match.winner_id && match.winner_id !== match.player1_id && canModifyResult ? 'Click to change winner' : ''}
            >
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center space-x-1">
                {onPlayerInfoClick && match.player1_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayerInfoClick(match.player1_id!);
                    }}
                    className="text-gray-400 hover:text-primary-400 transition-colors flex-shrink-0"
                    title="View player info"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                )}
                {participant1Seed && participant1Seed <= 4 && (
                  <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                )}
                {luckyLoserPlayerId === match.player1_id && (
                  <Star className="h-3 w-3 text-purple-400 fill-purple-400 flex-shrink-0" title="Lucky Loser" />
                )}
                <span
                  className={`font-medium truncate ${
                    match.player1_id ? 'text-white' : 'text-gray-500'
                  } ${canSelectWinner && match.player1_id ? 'hover:text-primary-300' : ''}`}
                >
                  {participant1Seed && match.player1_id && `#${participant1Seed} `}
                  <HighlightText
                    text={participant1Name.length > 12 ? participant1Name.substring(0, 12) + '...' : participant1Name}
                    searchQuery={searchQuery}
                  />
                </span>
                {match.winner_id === match.player1_id && (
                  <ChevronRight className="h-3 w-3 text-success-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                {participant1Elo && (
                  <span>{participant1Elo}</span>
                )}
                {participant1MemberCount && (
                  <span className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {participant1MemberCount}
                  </span>
                )}
              </div>
            </div>
            {canSelectWinner && match.player1_id && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trophy className="h-3 w-3 text-success-500" />
              </div>
            )}
          </div>
          )}
        
        <div className="w-full border-t border-gray-600"></div>

        {/* Participant 2 */}
        {canDragParticipants ? (
          <DraggableParticipant
            participantId={match.player2_id}
            participantName={participant2Name}
            participantSeed={participant2Seed}
            participantElo={participant2Elo}
            participantMemberCount={participant2MemberCount}
            isWinner={match.winner_id === match.player2_id}
            canDrag={canDragParticipants}
            canDrop={canDropParticipants}
            matchId={match.id}
            position="player2"
            onParticipantClick={handleParticipantClick}
            onPlayerInfoClick={onPlayerInfoClick}
            canSelect={canSelectWinner}
            clickTitle={match.winner_id && match.winner_id !== match.player2_id && canModifyResult ? 'Click to change winner' : ''}
            searchQuery={searchQuery}
          />
        ) : (
          <div className={`flex items-center justify-between p-1.5 rounded text-sm transition-all duration-200 ${
            match.winner_id === match.player2_id
              ? 'bg-success-900/30 border border-success-500/50'
              : canSelectWinner && match.player2_id
                ? 'hover:bg-primary-900/20 cursor-pointer border border-transparent hover:border-primary-500/30'
                : match.winner_id && canModifyResult && match.player2_id
                ? 'hover:bg-primary-900/20 cursor-pointer border border-transparent hover:border-primary-500/30'
                : ''
          }`}
          onClick={() => handleParticipantClick(match.player2_id)}
          title={match.winner_id && match.winner_id !== match.player2_id && canModifyResult ? 'Click to change winner' : ''}
          >
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center space-x-1">
                {onPlayerInfoClick && match.player2_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayerInfoClick(match.player2_id!);
                    }}
                    className="text-gray-400 hover:text-primary-400 transition-colors flex-shrink-0"
                    title="View player info"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                )}
                {participant2Seed && participant2Seed <= 4 && (
                  <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                )}
                {luckyLoserPlayerId === match.player2_id && (
                  <Star className="h-3 w-3 text-purple-400 fill-purple-400 flex-shrink-0" title="Lucky Loser" />
                )}
                <span
                  className={`font-medium truncate ${
                    match.player2_id ? 'text-white' : 'text-gray-500'
                  } ${canSelectWinner && match.player2_id ? 'hover:text-primary-300' : ''}`}
                >
                  {participant2Seed && match.player2_id && `#${participant2Seed} `}
                  <HighlightText
                    text={participant2Name.length > 12 ? participant2Name.substring(0, 12) + '...' : participant2Name}
                    searchQuery={searchQuery}
                  />
                </span>
                {match.winner_id === match.player2_id && (
                  <ChevronRight className="h-3 w-3 text-success-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                {participant2Elo && (
                  <span>{participant2Elo}</span>
                )}
                {participant2MemberCount && (
                  <span className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {participant2MemberCount}
                  </span>
                )}
              </div>
            </div>
            {canSelectWinner && match.player2_id && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trophy className="h-3 w-3 text-success-500" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    <ConfirmationModal
      isOpen={resetConfirm}
      onClose={() => setResetConfirm(false)}
      onConfirm={handleResetConfirm}
      title="Reset Match Result"
      message="Are you sure you want to reset this match result? This will clear the winner and may affect subsequent matches."
      confirmText="Reset"
      cancelText="Cancel"
      isDestructive={true}
      isLoading={isResetting}
    />

    <ConfirmationModal
      isOpen={changeWinnerConfirm !== null}
      onClose={() => setChangeWinnerConfirm(null)}
      onConfirm={handleChangeWinnerConfirm}
      title="Change Match Winner"
      message={changeWinnerConfirm ? `Change winner from ${changeWinnerConfirm.currentWinnerName} to ${changeWinnerConfirm.newWinnerName}?` : ''}
      confirmText="Change Winner"
      cancelText="Cancel"
      isDestructive={true}
      isLoading={isChangingWinner}
    />
  </>
  );
});

BracketMatch.displayName = 'BracketMatch';

export default BracketMatch;