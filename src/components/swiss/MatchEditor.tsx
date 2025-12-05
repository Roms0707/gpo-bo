import React, { useState } from 'react';
import { GripVertical, Save, X, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import toast from 'react-hot-toast';

interface MatchEditorProps {
  matches: any[];
  getParticipantName: (id: string | null) => string;
  onSave: (updatedMatches: any[]) => Promise<boolean>;
  onCancel: () => void;
}

const MatchEditor: React.FC<MatchEditorProps> = ({
  matches,
  getParticipantName,
  onSave,
  onCancel
}) => {
  const [editedMatches, setEditedMatches] = useState([...matches]);
  const [draggedParticipant, setDraggedParticipant] = useState<{
    matchIndex: number;
    participantKey: 'player1_id' | 'player2_id';
    participantId: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragStart = (
    e: React.DragEvent,
    matchIndex: number,
    participantKey: 'player1_id' | 'player2_id',
    participantId: string
  ) => {
    setDraggedParticipant({ matchIndex, participantKey, participantId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (
    e: React.DragEvent,
    targetMatchIndex: number,
    targetParticipantKey: 'player1_id' | 'player2_id'
  ) => {
    e.preventDefault();

    if (!draggedParticipant) return;

    const targetParticipantId = editedMatches[targetMatchIndex][targetParticipantKey];

    if (draggedParticipant.participantId === targetParticipantId) {
      setDraggedParticipant(null);
      return;
    }

    const newMatches = [...editedMatches];
    newMatches[draggedParticipant.matchIndex][draggedParticipant.participantKey] = targetParticipantId;
    newMatches[targetMatchIndex][targetParticipantKey] = draggedParticipant.participantId;

    setEditedMatches(newMatches);
    setDraggedParticipant(null);
  };

  const handleSwap = (matchIndex: number) => {
    const newMatches = [...editedMatches];
    const temp = newMatches[matchIndex].player1_id;
    newMatches[matchIndex].player1_id = newMatches[matchIndex].player2_id;
    newMatches[matchIndex].player2_id = temp;
    setEditedMatches(newMatches);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(editedMatches);
    setIsSaving(false);

    if (!success) {
      toast.error('Failed to save changes');
    }
  };

  return (
    <Card className="border-2 border-primary-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-primary-400">
            <GripVertical className="h-5 w-5 mr-2" />
            Edit Mode - Drag & Drop to Rearrange Matches
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              onClick={onCancel}
              leftIcon={<X size={16} />}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              leftIcon={<Save size={16} />}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-primary-900/20 border border-primary-500/30 rounded-lg text-sm text-primary-300">
          Drag and drop participants between matches to rearrange them. Click the swap button to quickly switch participants within a match.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {editedMatches.map((match, matchIndex) => (
            <div
              key={match.id}
              className="bg-dark-200 rounded-lg p-4 border-2 border-primary-500/30"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">Match {matchIndex + 1}</span>
                <button
                  onClick={() => handleSwap(matchIndex)}
                  className="p-1 hover:bg-primary-900/30 rounded transition-colors"
                  title="Swap participants"
                >
                  <RefreshCw className="h-4 w-4 text-primary-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, matchIndex, 'player1_id', match.player1_id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, matchIndex, 'player1_id')}
                  className="flex items-center p-3 rounded bg-dark-100 border-2 border-dashed border-primary-500/50 hover:border-primary-500 hover:bg-dark-50 cursor-move transition-all"
                >
                  <GripVertical className="h-4 w-4 text-primary-400 mr-2 flex-shrink-0" />
                  <span className="font-medium text-white truncate">
                    {getParticipantName(match.player1_id)}
                  </span>
                </div>

                <div className="text-center text-gray-400 text-sm">vs</div>

                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, matchIndex, 'player2_id', match.player2_id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, matchIndex, 'player2_id')}
                  className="flex items-center p-3 rounded bg-dark-100 border-2 border-dashed border-primary-500/50 hover:border-primary-500 hover:bg-dark-50 cursor-move transition-all"
                >
                  <GripVertical className="h-4 w-4 text-primary-400 mr-2 flex-shrink-0" />
                  <span className="font-medium text-white truncate">
                    {getParticipantName(match.player2_id)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchEditor;
