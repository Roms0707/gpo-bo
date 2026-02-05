import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RotateCcw, Edit2 } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import ConfirmationModal from '../ui/ConfirmationModal';
import MatchEditor from './MatchEditor';
import HighlightText from '../bracket/HighlightText';

interface SwissMatchesProps {
  currentRoundMatches: any[];
  getParticipantName: (id: string | null) => string;
  handleWinnerSelected: (matchId: string, winnerId: string) => void;
  currentRound: number;
  canEditMatches: boolean;
  onSaveEdits: (updatedMatches: any[]) => Promise<boolean>;
  onResetMatch: (matchId: string) => Promise<boolean>;
  onChangeWinner: (matchId: string, newWinnerId: string) => Promise<boolean>;
  canModifyResult: (matchId: string) => boolean;
  searchQuery?: string;
}

const SwissMatches: React.FC<SwissMatchesProps> = ({
  currentRoundMatches,
  getParticipantName,
  handleWinnerSelected,
  currentRound,
  canEditMatches,
  onSaveEdits,
  onResetMatch,
  onChangeWinner,
  canModifyResult,
  searchQuery = ''
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [resetConfirmMatch, setResetConfirmMatch] = useState<string | null>(null);
  const [changeWinnerConfirm, setChangeWinnerConfirm] = useState<{
    matchId: string;
    newWinnerId: string;
    currentWinnerName: string;
    newWinnerName: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isChangingWinner, setIsChangingWinner] = useState(false);
  const firstMatchRef = useRef<HTMLDivElement>(null);

  const filteredMatches = searchQuery
    ? currentRoundMatches.filter((match, index) => {
        const matchNumber = index + 1;
        const player1Name = getParticipantName(match.player1_id).toLowerCase();
        const player2Name = match.player2_id ? getParticipantName(match.player2_id).toLowerCase() : 'bye';
        const query = searchQuery.toLowerCase();

        return (
          matchNumber.toString().includes(query) ||
          player1Name.includes(query) ||
          player2Name.includes(query)
        );
      })
    : currentRoundMatches;

  useEffect(() => {
    if (searchQuery && filteredMatches.length > 0 && firstMatchRef.current) {
      firstMatchRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [searchQuery, filteredMatches.length]);

  if (currentRoundMatches.length === 0) {
    return null;
  }

  const handleSaveEdits = async (updatedMatches: any[]) => {
    const success = await onSaveEdits(updatedMatches);
    if (success) {
      setIsEditMode(false);
    }
    return success;
  };

  const handleResetConfirm = async () => {
    if (!resetConfirmMatch) return;

    setIsResetting(true);
    const success = await onResetMatch(resetConfirmMatch);
    setIsResetting(false);
    setResetConfirmMatch(null);
  };

  const handleChangeWinnerConfirm = async () => {
    if (!changeWinnerConfirm) return;

    setIsChangingWinner(true);
    const success = await onChangeWinner(changeWinnerConfirm.matchId, changeWinnerConfirm.newWinnerId);
    setIsChangingWinner(false);
    setChangeWinnerConfirm(null);
  };

  const handleParticipantClick = (match: any, participantId: string) => {
    if (isEditMode) return;

    if (!match.winner_id && participantId) {
      handleWinnerSelected(match.id, participantId);
    } else if (match.winner_id && match.winner_id !== participantId && canModifyResult(match.id)) {
      setChangeWinnerConfirm({
        matchId: match.id,
        newWinnerId: participantId,
        currentWinnerName: getParticipantName(match.winner_id),
        newWinnerName: getParticipantName(participantId)
      });
    }
  };

  if (isEditMode) {
    return (
      <MatchEditor
        matches={currentRoundMatches}
        getParticipantName={getParticipantName}
        onSave={handleSaveEdits}
        onCancel={() => setIsEditMode(false)}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Round {currentRound} Matches</CardTitle>
            {canEditMatches && (
              <Button
                onClick={() => setIsEditMode(true)}
                leftIcon={<Edit2 size={16} />}
                size="sm"
              >
                Edit Matches
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {searchQuery && (
            <div className="mb-4 text-sm text-gray-400">
              Showing {filteredMatches.length} of {currentRoundMatches.length} matches
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map((match, index) => {
              const matchNumber = currentRoundMatches.findIndex(m => m.id === match.id) + 1;
              const canModify = canModifyResult(match.id);
              const isByeMatch = !match.player2_id && match.player1_id;

              if (isByeMatch) {
                return (
                  <div
                    key={match.id}
                    ref={index === 0 && searchQuery ? firstMatchRef : null}
                    className={`bg-dark-200 rounded-lg p-4 border relative ${
                      searchQuery && filteredMatches.includes(match)
                        ? 'border-primary-500 ring-2 ring-primary-500/20'
                        : 'border-dark-100'
                    }`}
                  >
                    <div className="absolute -top-2 -left-2 z-10">
                      <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        BYE
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 rounded bg-success-900/30 border border-success-500/50">
                        <HighlightText
                          text={getParticipantName(match.player1_id)}
                          searchQuery={searchQuery}
                          className="font-medium text-white"
                        />
                        <Trophy className="h-4 w-4 text-success-500" />
                      </div>
                      <div className="text-center text-gray-500 text-sm italic">
                        Automatic advancement
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-xs text-amber-400 bg-amber-900/20 px-2 py-1 rounded">
                        +1 Win (BYE)
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={match.id}
                  ref={index === 0 && searchQuery ? firstMatchRef : null}
                  className={`bg-dark-200 rounded-lg p-4 border relative ${
                    searchQuery && filteredMatches.includes(match)
                      ? 'border-primary-500 ring-2 ring-primary-500/20'
                      : 'border-dark-100'
                  }`}
                >
                  <div className="absolute -top-2 -left-2 z-10">
                    <span className="bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      #{matchNumber}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div
                      className={`flex items-center justify-between p-2 rounded transition-all ${
                        match.winner_id === match.player1_id
                          ? 'bg-success-900/30 border border-success-500/50'
                          : match.winner_id && canModify
                          ? 'cursor-pointer hover:bg-primary-900/20 border border-transparent hover:border-primary-500/30'
                          : !match.winner_id
                          ? 'cursor-pointer hover:bg-primary-900/20 border border-transparent hover:border-primary-500/30'
                          : 'border border-transparent'
                      }`}
                      onClick={() => handleParticipantClick(match, match.player1_id)}
                      title={match.winner_id && match.winner_id !== match.player1_id && canModify ? 'Click to change winner' : ''}
                    >
                      <HighlightText
                        text={getParticipantName(match.player1_id)}
                        searchQuery={searchQuery}
                        className="font-medium text-white"
                      />
                      {match.winner_id === match.player1_id && (
                        <Trophy className="h-4 w-4 text-success-500" />
                      )}
                    </div>

                    <div className="text-center text-gray-400 text-sm">vs</div>

                    <div
                      className={`flex items-center justify-between p-2 rounded transition-all ${
                        match.winner_id === match.player2_id
                          ? 'bg-success-900/30 border border-success-500/50'
                          : match.winner_id && canModify
                          ? 'cursor-pointer hover:bg-primary-900/20 border border-transparent hover:border-primary-500/30'
                          : !match.winner_id
                          ? 'cursor-pointer hover:bg-primary-900/20 border border-transparent hover:border-primary-500/30'
                          : 'border border-transparent'
                      }`}
                      onClick={() => handleParticipantClick(match, match.player2_id)}
                      title={match.winner_id && match.winner_id !== match.player2_id && canModify ? 'Click to change winner' : ''}
                    >
                      <HighlightText
                        text={getParticipantName(match.player2_id)}
                        searchQuery={searchQuery}
                        className="font-medium text-white"
                      />
                      {match.winner_id === match.player2_id && (
                        <Trophy className="h-4 w-4 text-success-500" />
                      )}
                    </div>
                  </div>

                  {match.winner_id && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-success-400 bg-success-900/20 px-2 py-1 rounded">
                        Winner: {getParticipantName(match.winner_id)}
                      </span>
                      {canModify && (
                        <button
                          onClick={() => setResetConfirmMatch(match.id)}
                          className="p-1 hover:bg-error-900/30 rounded transition-colors"
                          title="Reset match result"
                        >
                          <RotateCcw className="h-4 w-4 text-error-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={resetConfirmMatch !== null}
        onClose={() => setResetConfirmMatch(null)}
        onConfirm={handleResetConfirm}
        title="Reset Match Result"
        message="Are you sure you want to reset this match result? This will clear the winner and recalculate standings."
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
};

export default SwissMatches;