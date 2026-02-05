import React from 'react';
import { Trophy, AlertTriangle, Database } from 'lucide-react';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';

interface EmptyBracketMessageProps {
  tournament: any;
  sqlQuery?: string;
  registrationsCount?: number;
}

const EmptyBracketMessage: React.FC<EmptyBracketMessageProps> = ({ 
  tournament,
  sqlQuery,
  registrationsCount = 0
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/brackets')}
          leftIcon={<Trophy size={16} />}
        >
          Back to Brackets
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Bracket - {tournament?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-16 w-16 text-warning-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Approved {tournament?.type === 'team' ? 'Teams' : 'Players'}
            </h3>
            <div className="text-gray-400 mb-6 max-w-2xl mx-auto">
              <p className="mb-2">
                This tournament doesn't have any approved {tournament?.type === 'team' ? 'team' : 'player'} registrations yet.
              </p>
              <div className="bg-dark-200 p-4 rounded-lg text-left text-sm mb-4">
                <h4 className="font-semibold text-warning-400 flex items-center mb-2">
                  <Database className="h-4 w-4 mr-2" />
                  Troubleshooting Steps:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-300">
                  <li>Verify that players have registered for this tournament</li>
                  <li>Check that registrations have been approved in the Registrations section</li>
                  <li>Ensure that player accounts exist in the database</li>
                  <li>For team tournaments, verify that teams have captains and enough members</li>
                </ol>
                
                {registrationsCount > 0 && (
                  <div className="mt-3 p-2 bg-warning-900/20 border border-warning-500/30 rounded">
                    <p className="text-warning-300">Found {registrationsCount} approved registrations, but they couldn't be used in the bracket.</p>
                  </div>
                )}
                
                {sqlQuery && (
                  <div className="mt-3">
                    <h5 className="font-semibold text-yellow-400 mb-1">SQL Query Used:</h5>
                    <pre className="text-xs text-green-400 bg-dark-400 p-2 rounded overflow-x-auto whitespace-pre-wrap">{sqlQuery}</pre>
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={() => navigate('/registrations')}
              size="lg"
              className="px-6"
            >
              Manage Registrations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmptyBracketMessage;