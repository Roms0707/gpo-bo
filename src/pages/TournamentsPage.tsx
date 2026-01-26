import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, Trash2, Trophy, Twitch, TowerControl as GameController, Calendar, Clock, Users, Filter, Book, Copy, Globe, Building2 } from 'lucide-react';
import { useTournamentStore } from '../store/tournamentStore';
import { useGameStore } from '../store/gameStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import TournamentRulesModal from '../components/tournament/TournamentRulesModal';
import { ProjectConfigSelector } from '../components/tournament/ProjectConfigSelector';
import { formatDate } from '../utils/dateUtils';
import { useAuthStore } from '../store/authStore';
import { getCountryDisplay } from '../utils/countryUtils';
import { fetchProjectConfigurationByConfigId, ProjectConfiguration } from '../services/projectConfigService';

const TournamentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tournaments, fetchTournaments, deleteTournament, updateTournamentRules, duplicateTournament, isLoading } = useTournamentStore();
  const { games, fetchGames } = useGameStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [selectedTournamentForDuplicate, setSelectedTournamentForDuplicate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserCountry, setCurrentUserCountry] = useState<string | null>(null);

  // Rules modal state
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [selectedTournamentForRules, setSelectedTournamentForRules] = useState<any>(null);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Duplicate with config selection
  const [duplicateTargetConfigId, setDuplicateTargetConfigId] = useState<string | null>(null);

  // Config cache for badges
  const [configsCache, setConfigsCache] = useState<Record<string, ProjectConfiguration>>({});

  useEffect(() => {
    fetchTournaments();
    fetchGames();
  }, []);

  useEffect(() => {
    const fetchConfigs = async () => {
      const configIds = [...new Set(tournaments.map(t => t.config_id).filter(Boolean))] as string[];
      const missingIds = configIds.filter(id => !configsCache[id]);

      for (const configId of missingIds) {
        const result = await fetchProjectConfigurationByConfigId(configId);
        if (result.data) {
          setConfigsCache(prev => ({ ...prev, [configId]: result.data! }));
        }
      }
    };

    if (tournaments.length > 0) {
      fetchConfigs();
    }
  }, [tournaments]);

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? tournament.status === statusFilter : true;
    const matchesType = typeFilter ? tournament.type === typeFilter : true;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDeleteClick = (id: string) => {
    setSelectedTournament(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedTournament) {
      await deleteTournament(selectedTournament);
      setDeleteModalOpen(false);
    }
  };

  const handleManageRulesClick = (tournament: any) => {
    setSelectedTournamentForRules(tournament);
    setIsRulesModalOpen(true);
  };

  const handleSaveRules = async (rules: string) => {
    if (!selectedTournamentForRules) return;

    try {
      setIsSavingRules(true);
      await updateTournamentRules(selectedTournamentForRules.id, rules);
      setIsRulesModalOpen(false);
    } catch (error) {
      console.error('Error saving tournament rules:', error);
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleDuplicateClick = (id: string) => {
    const tournament = tournaments.find(t => t.id === id);
    setSelectedTournamentForDuplicate(id);
    setDuplicateTargetConfigId(tournament?.config_id || null);
    setDuplicateModalOpen(true);
  };

  const confirmDuplicate = async () => {
    if (selectedTournamentForDuplicate) {
      const result = await duplicateTournament(selectedTournamentForDuplicate, duplicateTargetConfigId);
      setDuplicateModalOpen(false);
      setDuplicateTargetConfigId(null);
      if (result.data) {
        navigate(`/tournaments/edit/${result.data.id}`);
      }
    }
  };

  const getConfigBadge = (configId: string | null) => {
    if (!configId) {
      return (
        <div className="flex items-center gap-1">
          <Globe size={14} className="text-blue-400" />
          <span className="text-xs text-blue-400">Worldwide</span>
        </div>
      );
    }

    const config = configsCache[configId];
    return (
      <div className="flex items-center gap-1">
        <Building2 size={14} className="text-emerald-400" />
        <span className="text-xs text-emerald-400 truncate max-w-[100px]">
          {config?.brand_name || configId}
        </span>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="primary">Upcoming</Badge>;
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'solo':
        return <Badge variant="accent">Solo</Badge>;
      case 'team':
        return <Badge variant="secondary">Team</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getGameName = (gameId: string | null) => {
    if (!gameId) return '-';
    const game = games.find(g => g.id === gameId);
    return game ? game.name : '-';
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredTournaments.map((tournament) => (
        <Card
          key={tournament.id}
          variant={tournament.status === 'active' ? 'active' : tournament.status === 'past' ? 'past' : 'default'}
          className="h-full flex flex-col"
        >
          <div className="relative h-32 bg-gradient-to-r from-dark-300 to-dark-100 rounded-t-lg overflow-hidden">
            {tournament.header_url ? (
              <img
                src={tournament.header_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-500 to-transparent flex items-end p-4">
              <div className="flex items-center space-x-2">
                {tournament.icon_url ? (
                  <img
                    src={tournament.icon_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-lg truncate">{tournament.title}</h3>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="flex-1 flex flex-col">
            <div className="flex flex-wrap gap-2 mb-3 mt-2">
              {getStatusBadge(tournament.status)}
              {getTypeBadge(tournament.type)}
              {getConfigBadge(tournament.config_id)}
              {!tournament.config_id && (() => {
                const countryInfo = getCountryDisplay(tournament.eligible_countries);
                return countryInfo ? (
                  <div className="flex items-center">
                    <span className="text-base mr-1">{countryInfo.flag}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{countryInfo.value}</span>
                  </div>
                ) : null;
              })()}
              {tournament.game_id && (
                <div className="flex items-center">
                  <GameController size={14} className="text-accent-500 mr-1" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{getGameName(tournament.game_id)}</span>
                </div>
              )}
              {tournament.twitch_url && (
                <div className="flex items-center">
                  <Twitch size={14} className="text-purple-500 mr-1" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Twitch</span>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Début: {formatDate(tournament.start_date)}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Fin: {formatDate(tournament.end_date)}</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                <span>{tournament.type === 'solo' ? 'Solo Players' : 'Teams'}</span>
              </div>
            </div>

            <div className="mt-auto flex justify-end space-x-2">
              <Link to={`/tournaments/${tournament.id}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  title="View"
                >
                  <Eye size={16} />
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                title="Manage Rules"
                onClick={(e) => {
                  e.preventDefault();
                  handleManageRulesClick(tournament);
                }}
              >
                <Book size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                title="Duplicate Tournament"
                onClick={(e) => {
                  e.preventDefault();
                  handleDuplicateClick(tournament.id);
                }}
              >
                <Copy size={16} />
              </Button>
              <Link to={`/tournaments/edit/${tournament.id}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Edit"
                >
                  <Edit size={16} />
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                title="Delete"
                onClick={() => handleDeleteClick(tournament.id)}
              >
                <Trash2 size={16} className="text-error-500" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-200">
        <thead className="bg-gray-50 dark:bg-dark-200">
          <tr>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tournament
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
              Game
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
              Project
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
              Country
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
              Format
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
              Dates
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-300 divide-y divide-gray-200 dark:divide-dark-300">
          {filteredTournaments.map((tournament) => (
            <tr
              key={tournament.id}
              className={tournament.status === 'active' ? 'bg-success-50 dark:bg-success-900/10' : ''}
            >
              <td className="px-3 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  {tournament.icon_url ? (
                    <img
                      src={tournament.icon_url}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center">
                      <Trophy className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{tournament.title}</span>
                  {tournament.twitch_url && (
                    <Twitch size={14} className="text-purple-500" />
                  )}
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                {getTypeBadge(tournament.type)}
              </td>
              <td className="px-3 py-4 whitespace-nowrap hidden md:table-cell">
                <div className="flex items-center">
                  {tournament.game_id && (
                    <GameController size={14} className="text-accent-500 mr-1" />
                  )}
                  <span className="text-gray-500 dark:text-gray-400">{getGameName(tournament.game_id)}</span>
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap hidden lg:table-cell">
                {getConfigBadge(tournament.config_id)}
              </td>
              <td className="px-3 py-4 whitespace-nowrap hidden xl:table-cell">
                {tournament.config_id ? (
                  <span className="text-gray-400 text-xs italic">Overridden</span>
                ) : (() => {
                  const countryInfo = getCountryDisplay(tournament.eligible_countries);
                  return countryInfo ? (
                    <div className="flex items-center">
                      <span className="text-base mr-1">{countryInfo.flag}</span>
                      <span className="text-gray-500 dark:text-gray-400">{countryInfo.value}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">All</span>
                  );
                })()}
              </td>
              <td className="px-3 py-4 whitespace-nowrap hidden lg:table-cell text-gray-500 dark:text-gray-400">
                {tournament.tournament_format || '-'}
              </td>
              <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <div>{formatDate(tournament.start_date)}</div>
                  <div>{formatDate(tournament.end_date)}</div>
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                {getStatusBadge(tournament.status)}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-right">
                <div className="flex justify-end space-x-2">
                  <Link to={`/tournaments/${tournament.id}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="View"
                    >
                      <Eye size={16} />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Manage Rules"
                    onClick={(e) => {
                      e.preventDefault();
                      handleManageRulesClick(tournament);
                    }}
                  >
                    <Book size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Duplicate Tournament"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDuplicateClick(tournament.id);
                    }}
                  >
                    <Copy size={16} />
                  </Button>
                  <Link to={`/tournaments/edit/${tournament.id}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Delete"
                    onClick={() => handleDeleteClick(tournament.id)}
                  >
                    <Trash2 size={16} className="text-error-500" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search tournaments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-2 h-2 bg-current rounded-sm"></div>
                <div className="w-2 h-2 bg-current rounded-sm"></div>
                <div className="w-2 h-2 bg-current rounded-sm"></div>
                <div className="w-2 h-2 bg-current rounded-sm"></div>
              </div>
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <div className="flex flex-col space-y-0.5 w-4">
                <div className="w-full h-0.5 bg-current rounded-sm"></div>
                <div className="w-full h-0.5 bg-current rounded-sm"></div>
                <div className="w-full h-0.5 bg-current rounded-sm"></div>
              </div>
            </Button>
          </div>

          <div className="w-32">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'active', label: 'Active' },
                { value: 'past', label: 'Past' }
              ]}
              leftIcon={<Filter className="h-4 w-4 text-gray-400" />}
            />
          </div>

          <div className="w-32">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'solo', label: 'Solo' },
                { value: 'team', label: 'Team' }
              ]}
              leftIcon={<Users className="h-4 w-4 text-gray-400" />}
            />
          </div>

          <Link to="/tournaments/new">
            <Button leftIcon={<Plus size={16} />}>
              Add Tournament
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <CardTitle>Tournaments</CardTitle>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0">
            {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No tournaments found</p>
            </div>
          ) : (
            viewMode === 'grid' ? renderGridView() : renderListView()
          )}
        </CardContent>

        {filteredTournaments.length > 0 && (
          <CardFooter className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredTournaments.length} of {tournaments.length} tournaments
            </div>
          </CardFooter>
        )}
      </Card>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isLoading}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-white">Are you sure you want to delete this tournament? This action cannot be undone.</p>
      </Modal>

      <Modal
        isOpen={duplicateModalOpen}
        onClose={() => {
          setDuplicateModalOpen(false);
          setDuplicateTargetConfigId(null);
        }}
        title="Duplicate Tournament"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => {
              setDuplicateModalOpen(false);
              setDuplicateTargetConfigId(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmDuplicate} isLoading={isLoading}>
              Duplicate
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            A copy of this tournament will be created and you will be redirected to edit it.
          </p>

          <div className="pt-2">
            <ProjectConfigSelector
              value={duplicateTargetConfigId}
              onChange={(configId) => setDuplicateTargetConfigId(configId)}
              label="Target Project Configuration"
              helpText="Select the project for the duplicated tournament. Choosing a specific project will override country restrictions."
            />
          </div>
        </div>
      </Modal>

      {/* Tournament Rules Modal */}
      {selectedTournamentForRules && (
        <TournamentRulesModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          tournamentId={selectedTournamentForRules.id}
          initialRules={selectedTournamentForRules.rules}
          onSave={handleSaveRules}
          isLoading={isSavingRules}
        />
      )}
    </div>
  );
};

export default TournamentsPage;
