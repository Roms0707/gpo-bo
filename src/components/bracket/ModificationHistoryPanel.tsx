import React, { useEffect, useState } from 'react';
import { X, History, User, Clock, FileText } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getModificationHistory } from '../../services/crossRoundService';

interface ModificationHistoryPanelProps {
  show: boolean;
  onClose: () => void;
  tournamentId: string;
}

interface ModificationRecord {
  id: string;
  round: number;
  modification_type: string;
  previous_state: any;
  new_state: any;
  reason?: string;
  created_at: string;
  modified_by_user?: {
    username?: string;
    email?: string;
  };
}

const ModificationHistoryPanel: React.FC<ModificationHistoryPanelProps> = ({
  show,
  onClose,
  tournamentId
}) => {
  const [history, setHistory] = useState<ModificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (show) {
      loadHistory();
    }
  }, [show, tournamentId]);

  const loadHistory = async () => {
    setIsLoading(true);
    const records = await getModificationHistory(tournamentId);
    setHistory(records);
    setIsLoading(false);
  };

  const getModificationTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      player_swap: 'Échange de joueurs',
      player_reassign: 'Réassignation',
      bye_fill: 'BYE rempli',
      manual_move: 'Déplacement manuel',
      cross_round_move: 'Déplacement cross-round'
    };
    return labels[type] || type;
  };

  const getModificationTypeVariant = (type: string): 'success' | 'warning' | 'info' | 'error' | 'default' => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'error' | 'default'> = {
      player_swap: 'info',
      player_reassign: 'warning',
      bye_fill: 'success',
      manual_move: 'default',
      cross_round_move: 'warning'
    };
    return variants[type] || 'default';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!show) return null;

  return (
    <div className="fixed right-4 top-20 z-50 w-[500px] bg-dark-300 border-2 border-primary-500 rounded-lg shadow-2xl max-h-[85vh] flex flex-col">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-white" />
          <h3 className="text-white font-bold">Historique des Modifications</h3>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">Aucune modification enregistrée</p>
            <p className="text-xs text-gray-500 mt-1">Les modifications du bracket apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(record => (
              <div
                key={record.id}
                className="bg-dark-200 rounded-lg p-3 border border-gray-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={getModificationTypeVariant(record.modification_type)} size="sm">
                        {getModificationTypeLabel(record.modification_type)}
                      </Badge>
                      <Badge variant="default" size="sm">
                        Round {record.round}
                      </Badge>
                    </div>
                  </div>
                </div>

                {record.reason && (
                  <div className="flex items-start space-x-2 mb-2">
                    <FileText className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-300">{record.reason}</p>
                  </div>
                )}

                <div className="bg-dark-300 rounded p-2 mb-2 text-xs space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Avant:</span>
                      <div className="text-gray-300 mt-1">
                        <div>P1: {record.previous_state.player1_id ? '✓' : '∅'}</div>
                        <div>P2: {record.previous_state.player2_id ? '✓' : '∅'}</div>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Après:</span>
                      <div className="text-gray-300 mt-1">
                        <div>P1: {record.new_state.player1_id ? '✓' : '∅'}</div>
                        <div>P2: {record.new_state.player2_id ? '✓' : '∅'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>
                      {record.modified_by_user?.username || record.modified_by_user?.email || 'Système'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(record.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-600 bg-dark-200 rounded-b-lg flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Total des modifications:</span>
          <span className="text-white font-medium">{history.length}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="w-full"
        >
          Fermer
        </Button>
      </div>
    </div>
  );
};

export default ModificationHistoryPanel;
