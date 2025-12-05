import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, Users, TrendingUp, Activity, Download, UserPlus } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { TournamentRegistrationDetail } from '../../hooks/useRegistrationStats';

interface TournamentComparisonTableProps {
  tournaments: TournamentRegistrationDetail[];
  isLoading: boolean;
  onExportPlayers?: (tournamentId: string) => void;
  canExportPlayers?: boolean;
}

const TournamentComparisonTable: React.FC<TournamentComparisonTableProps> = ({
  tournaments,
  isLoading,
  onExportPlayers,
  canExportPlayers = false,
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof TournamentRegistrationDetail>('totalRegistrations');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (column: keyof TournamentRegistrationDetail) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedTournaments = [...tournaments].sort((a, b) => {
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return sortDirection === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  const paginatedTournaments = sortedTournaments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedTournaments.length / itemsPerPage);

  const handleExport = () => {
    const headers = ['Tournament', 'Game', 'Registrations', 'Capacity', 'Fill Rate', 'Speed (h)', 'Status', 'Type'];
    const rows = sortedTournaments.map(t => [
      t.tournamentTitle,
      t.gameName,
      t.totalRegistrations.toString(),
      t.maxPlayers.toString(),
      `${t.fillRate}%`,
      t.registrationSpeed.toString(),
      t.status,
      t.type,
    ]);

    // Use semicolon delimiter and escape values with quotes for better Excel compatibility
    const csvContent = [headers, ...rows].map(row =>
      row.map(item => {
        const value = item != null ? String(item) : '';
        return `"${value.replace(/"/g, '""')}"`;
      }).join(';')
    ).join('\n');

    // Add UTF-8 BOM for better Excel compatibility
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  if (isLoading) {
    return (
      <Card className="bg-dark-100 border border-dark-200">
        <CardHeader>
          <CardTitle className="text-white">Tournament Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-dark-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card className="bg-dark-100 border border-dark-200">
        <CardHeader>
          <CardTitle className="text-white">Tournament Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            No tournament data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const SortIcon: React.FC<{ column: keyof TournamentRegistrationDetail }> = ({ column }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <Card className="bg-dark-100 border border-dark-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-white">
            <Trophy className="h-5 w-5 text-accent-500 mr-2" />
            Tournament Comparison
          </CardTitle>
          <button
            onClick={handleExport}
            className="flex items-center px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm transition-colors"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-200">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('tournamentTitle')}
                    className="hover:text-white transition-colors"
                  >
                    Tournament
                    <SortIcon column="tournamentTitle" />
                  </button>
                </th>
                <th className="text-left p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('gameName')}
                    className="hover:text-white transition-colors"
                  >
                    Game
                    <SortIcon column="gameName" />
                  </button>
                </th>
                <th className="text-center p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('totalRegistrations')}
                    className="hover:text-white transition-colors"
                  >
                    Registrations
                    <SortIcon column="totalRegistrations" />
                  </button>
                </th>
                <th className="text-center p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('fillRate')}
                    className="hover:text-white transition-colors"
                  >
                    Fill Rate
                    <SortIcon column="fillRate" />
                  </button>
                </th>
                <th className="text-center p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('registrationSpeed')}
                    className="hover:text-white transition-colors"
                  >
                    Speed (h)
                    <SortIcon column="registrationSpeed" />
                  </button>
                </th>
                <th className="text-center p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-10 p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200">
              {paginatedTournaments.map((tournament) => (
                <React.Fragment key={tournament.tournamentId}>
                  <tr className="hover:bg-dark-200/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center">
                        <div>
                          <p className="font-medium text-white text-sm">{tournament.tournamentTitle}</p>
                          <Badge variant={tournament.type === 'solo' ? 'accent' : 'secondary'} className="mt-1 text-xs">
                            {tournament.type}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-gray-300">{tournament.gameName}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-semibold text-white">{tournament.totalRegistrations}</span>
                        <span className="text-xs text-gray-400">/ {tournament.maxPlayers || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-semibold text-white mb-1">{tournament.fillRate}%</span>
                        <div className="w-full bg-dark-300 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              tournament.fillRate >= 80 ? 'bg-success-500' :
                              tournament.fillRate >= 50 ? 'bg-primary-500' :
                              tournament.fillRate >= 25 ? 'bg-yellow-500' : 'bg-error-500'
                            }`}
                            style={{ width: `${Math.min(tournament.fillRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          tournament.registrationSpeed < 24 ? 'success' :
                          tournament.registrationSpeed < 72 ? 'primary' : 'secondary'
                        }
                      >
                        {tournament.registrationSpeed}h
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          tournament.status === 'active' ? 'success' :
                          tournament.status === 'upcoming' ? 'primary' : 'secondary'
                        }
                      >
                        {tournament.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canExportPlayers && onExportPlayers && tournament.totalRegistrations > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onExportPlayers(tournament.tournamentId)}
                            title="Export player data"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        <button
                          onClick={() => setExpandedRow(expandedRow === tournament.tournamentId ? null : tournament.tournamentId)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {expandedRow === tournament.tournamentId ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === tournament.tournamentId && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <div className="bg-dark-200/50 p-4 border-t border-dark-300">
                          <div className="grid grid-cols-4 gap-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-success-500 rounded" />
                              <div>
                                <p className="text-xs text-gray-400">Approved</p>
                                <p className="text-lg font-semibold text-white">{tournament.approvedCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-yellow-500 rounded" />
                              <div>
                                <p className="text-xs text-gray-400">Pending</p>
                                <p className="text-lg font-semibold text-white">{tournament.pendingCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-gray-500 rounded" />
                              <div>
                                <p className="text-xs text-gray-400">Backup</p>
                                <p className="text-lg font-semibold text-white">{tournament.backupCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-error-500 rounded" />
                              <div>
                                <p className="text-xs text-gray-400">Rejected</p>
                                <p className="text-lg font-semibold text-white">{tournament.rejectedCount}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-200">
            <p className="text-sm text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedTournaments.length)} of {sortedTournaments.length} tournaments
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-dark-200 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-300 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-dark-200 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-300 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentComparisonTable;
