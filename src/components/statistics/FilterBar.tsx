import React, { useEffect, useState } from 'react';
import { Filter, X, Calendar, Trophy, Users, Activity, Share2, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { FilterState } from '../../hooks/useUrlFilters';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
  activeFilterCount: number;
  onShare: () => void;
}

interface Tournament {
  id: string;
  title: string;
  status: string;
  type: string;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  onReset,
  activeFilterCount,
  onShare,
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [showTournamentDropdown, setShowTournamentDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('id, title, status, type')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTournaments(data || []);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
      } finally {
        setIsLoadingTournaments(false);
      }
    };

    fetchTournaments();
  }, []);

  const filteredTournaments = tournaments.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTournamentToggle = (tournamentId: string) => {
    const newIds = filters.tournamentIds.includes(tournamentId)
      ? filters.tournamentIds.filter(id => id !== tournamentId)
      : [...filters.tournamentIds, tournamentId];
    onFiltersChange({ tournamentIds: newIds });
  };

  const handleStatusFilter = (status: string) => {
    onFiltersChange({ status: filters.status === status ? '' : status });
  };

  const handleTypeFilter = (type: string) => {
    onFiltersChange({ type: filters.type === type ? '' : type });
  };

  const handlePeriodChange = (period: FilterState['period']) => {
    const now = new Date();
    let startDate = '';
    let endDate = now.toISOString();

    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === 'all') {
      startDate = '';
      endDate = '';
    }

    onFiltersChange({ period, startDate, endDate });
  };

  const handleShare = () => {
    onShare();
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const selectedTournamentsText = filters.tournamentIds.length > 0
    ? `${filters.tournamentIds.length} selected`
    : 'All Tournaments';

  return (
    <div className="bg-dark-100 border border-dark-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="primary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="text-gray-400 hover:text-white"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-gray-400 hover:text-white"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            <Trophy className="h-4 w-4 inline mr-1" />
            Tournaments
          </label>
          <button
            onClick={() => setShowTournamentDropdown(!showTournamentDropdown)}
            className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-left text-white hover:bg-dark-300 transition-colors"
          >
            {selectedTournamentsText}
          </button>
          {showTournamentDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-dark-200 border border-dark-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
              <div className="p-2 border-b border-dark-300">
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-300 border border-dark-400 rounded text-white text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {isLoadingTournaments ? (
                  <div className="p-4 text-center text-gray-400">Loading...</div>
                ) : filteredTournaments.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">No tournaments found</div>
                ) : (
                  filteredTournaments.map((tournament) => (
                    <label
                      key={tournament.id}
                      className="flex items-center px-3 py-2 hover:bg-dark-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.tournamentIds.includes(tournament.id)}
                        onChange={() => handleTournamentToggle(tournament.id)}
                        className="mr-2"
                      />
                      <span className="text-sm text-white flex-1">{tournament.title}</span>
                      <Badge
                        variant={
                          tournament.status === 'active' ? 'success' :
                          tournament.status === 'upcoming' ? 'primary' : 'secondary'
                        }
                        className="text-xs ml-2"
                      >
                        {tournament.status}
                      </Badge>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            <Activity className="h-4 w-4 inline mr-1" />
            Status
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => handleStatusFilter('active')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.status === 'active'
                  ? 'bg-success-500 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-300'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleStatusFilter('upcoming')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.status === 'upcoming'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-300'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => handleStatusFilter('past')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.status === 'past'
                  ? 'bg-gray-500 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-300'
              }`}
            >
              Past
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            <Users className="h-4 w-4 inline mr-1" />
            Type
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => handleTypeFilter('solo')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.type === 'solo'
                  ? 'bg-accent-500 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-300'
              }`}
            >
              Solo
            </button>
            <button
              onClick={() => handleTypeFilter('team')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.type === 'team'
                  ? 'bg-secondary-500 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-300'
              }`}
            >
              Team
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Period
          </label>
          <select
            value={filters.period}
            onChange={(e) => handlePeriodChange(e.target.value as FilterState['period'])}
            className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {showTournamentDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowTournamentDropdown(false)}
        />
      )}
    </div>
  );
};

export default FilterBar;
