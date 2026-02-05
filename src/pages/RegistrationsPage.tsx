import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Eye, CheckCircle, XCircle, Calendar, Users, Trophy, TowerControl as GameController, X, Shield, RotateCcw, Rocket } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';
import { useTournamentStore } from '../store/tournamentStore';
import { formatDateWithTime } from '../utils/dateUtils';
import { parseFieldValue, formatFieldValueForDisplay, formatFieldValueForModal } from '../utils/fieldValueUtils';
import BracketLaunchModal from '../components/tournament/BracketLaunchModal';
import { validateTournamentLaunch } from '../utils/tournamentValidation';
import CSVExportModal from '../components/tournament/CSVExportModal';
import { exportPlayersToCSV } from '../utils/csvExportUtils';
import { useAuthStore } from '../store/authStore';

type TournamentRegistration = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  tournament: {
    id: string;
    title: string;
    type: 'solo' | 'team';
    status: string;
    tournament_format?: string;
    game_id?: string;
  };
  user: {
    id: string;
    email: string;
    has_parental_consent?: boolean | null;
    country?: string | null;
    username?: string | null;
    discord_handle?: string | null;
  };
  team?: {
    id: string;
    name: string;
  } | null;
  is_captain?: boolean;
};

type UserTournamentFieldValue = {
  id: string;
  user_id: string;
  tournament_id: string;
  field_id: string;
  field_index: number;
  value: Record<string, string>;
  field: {
    id: string;
    name: string;
    field_type: string;
  };
};

type GamePublisherId = {
  id: string;
  user_id: string;
  game_id: string;
  game_publisher_id: string;
  value: string;
  created_at: string;
  publisher_id: {
    label: string;
    id_name: string;
  };
};

type TeamMember = {
  id: string;
  user_id: string;
  role: 'captain' | 'member';
  user: {
    email: string;
    username?: string | null;
  };
};

type TournamentField = {
  id: string;
  name: string;
  field_type: string;
};

type UserFieldValuesMap = Map<string, Map<string, Array<{ index: number; value: Record<string, string> }>>>;

type UserGamePublisherIdMap = Map<string, { label: string; value: string }>;

type RegistrationStatusFilter = 'open' | 'closed' | 'all';

const RegistrationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tournaments, fetchTournaments } = useTournamentStore();
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<TournamentRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<RegistrationStatusFilter>('open');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedRegistrations, setGroupedRegistrations] = useState<Record<string, TournamentRegistration[]>>({});
  
  const [isPlayerDetailsModalOpen, setIsPlayerDetailsModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<TournamentRegistration | null>(null);
  const [userFieldValues, setUserFieldValues] = useState<UserTournamentFieldValue[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [debugSqlQuery, setDebugSqlQuery] = useState<string>('');
  const [userGamePublisherIds, setUserGamePublisherIds] = useState<GamePublisherId[]>([]);
  const [isLoadingPublisherIds, setIsLoadingPublisherIds] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);

  const [tournamentFields, setTournamentFields] = useState<Map<string, TournamentField[]>>(new Map());
  const [allUserFieldValues, setAllUserFieldValues] = useState<UserFieldValuesMap>(new Map());
  const [isLoadingTournamentFields, setIsLoadingTournamentFields] = useState(false);
  const [allUserGamePublisherIds, setAllUserGamePublisherIds] = useState<Map<string, UserGamePublisherIdMap>>(new Map());

  const [isBracketLaunchModalOpen, setIsBracketLaunchModalOpen] = useState(false);
  const [selectedTournamentForLaunch, setSelectedTournamentForLaunch] = useState<any>(null);
  const [isLaunchingBracket, setIsLaunchingBracket] = useState(false);

  const [isCSVExportModalOpen, setIsCSVExportModalOpen] = useState(false);
  const [selectedTournamentForExport, setSelectedTournamentForExport] = useState<any>(null);
  const [highlightedTournamentId, setHighlightedTournamentId] = useState<string | null>(null);

  const registrationsListRef = useRef<HTMLDivElement>(null);
  const tournamentCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { canGenerateReports } = useAuthStore();
  const allTournaments = tournaments;

  const isRegistrationOpen = (tournament: any): boolean => {
    if (!tournament.registration_end_date) return false;
    const now = new Date();
    const endDate = new Date(tournament.registration_end_date);
    return now <= endDate;
  };

  const getFilteredTournaments = () => {
    if (registrationStatusFilter === 'all') return allTournaments;
    return allTournaments.filter(t => {
      const isOpen = isRegistrationOpen(t);
      return registrationStatusFilter === 'open' ? isOpen : !isOpen;
    });
  };

  const filteredTournaments = getFilteredTournaments();

  const getRegistrationStatusCounts = () => {
    const open = allTournaments.filter(t => isRegistrationOpen(t)).length;
    const closed = allTournaments.filter(t => !isRegistrationOpen(t)).length;
    return { open, closed, all: allTournaments.length };
  };

  const statusCounts = getRegistrationStatusCounts();

  useEffect(() => {
    fetchTournaments();
    fetchRegistrations();
    fetchAllTournamentFieldsAndValues();
  }, [fetchTournaments]);


  const fetchAllTournamentFieldsAndValues = async () => {
    try {
      setIsLoadingTournamentFields(true);

      // Fetch all tournament fields (global and tournament-specific)
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('tournament_fields')
        .select('id, name, field_type, tournament_id')
        .order('name');


      if (fieldsError) throw fieldsError;

      // Group fields by tournament_id
      // Global fields (tournament_id = null) should be available for all tournaments
      const globalFields: TournamentField[] = [];
      const fieldsMap = new Map<string, TournamentField[]>();

      fieldsData?.forEach(field => {
        const fieldObj = {
          id: field.id,
          name: field.name,
          field_type: field.field_type
        };

        if (field.tournament_id === null) {
          // This is a global field, store it separately
          globalFields.push(fieldObj);
        } else {
          // This is a tournament-specific field
          if (!fieldsMap.has(field.tournament_id)) {
            fieldsMap.set(field.tournament_id, []);
          }
          fieldsMap.get(field.tournament_id)!.push(fieldObj);
        }
      });

      // Add global fields to each tournament
      if (globalFields.length > 0) {
        // Get all unique tournament IDs from registrations
        const tournamentIds = new Set(registrations.map(r => r.tournament.id));
        tournamentIds.forEach(tournamentId => {
          if (!fieldsMap.has(tournamentId)) {
            fieldsMap.set(tournamentId, []);
          }
          // Add global fields to this tournament
          fieldsMap.get(tournamentId)!.push(...globalFields);
        });
      }

      setTournamentFields(fieldsMap);

      // Fetch all user field values
      const { data: valuesData, error: valuesError } = await supabase
        .from('user_tournament_field_values')
        .select('user_id, tournament_id, field_id, field_index, value');

      if (valuesError) throw valuesError;

      // Create a map: userId -> tournamentId -> fieldId -> values array
      const valuesMap = new Map<string, Map<string, Array<{ index: number; value: Record<string, string> }>>>();
      valuesData?.forEach(fv => {
        const key = `${fv.user_id}_${fv.tournament_id}`;
        if (!valuesMap.has(key)) {
          valuesMap.set(key, new Map());
        }
        if (!valuesMap.get(key)!.has(fv.field_id)) {
          valuesMap.get(key)!.set(fv.field_id, []);
        }
        const parsedValue = parseFieldValue(fv.value);
        valuesMap.get(key)!.get(fv.field_id)!.push({ index: fv.field_index, value: parsedValue });
      });

      setAllUserFieldValues(valuesMap);

      // Fetch all game publisher IDs for users
      // First, get all unique game IDs from tournaments
      const gameIds = new Set(
        tournaments
          .filter(t => t.game_id)
          .map(t => t.game_id as string)
      );

      if (gameIds.size > 0) {
        // Fetch game publisher ID definitions for these games
        const { data: publisherIdsData, error: publisherIdsError } = await supabase
          .from('game_publisher_ids')
          .select('id, game_id, label')
          .in('game_id', Array.from(gameIds));

        if (publisherIdsError) {
          console.error('Error fetching game publisher IDs:', publisherIdsError);
        } else {
          // Create a map of game_id -> publisher_id definitions
          const gamePublisherIdMap = new Map<string, { id: string; label: string }[]>();
          publisherIdsData?.forEach(pid => {
            if (!gamePublisherIdMap.has(pid.game_id)) {
              gamePublisherIdMap.set(pid.game_id, []);
            }
            gamePublisherIdMap.get(pid.game_id)!.push({ id: pid.id, label: pid.label });
          });

          // Get all user IDs from registrations
          const userIds = Array.from(new Set(registrations.map(r => r.user.id)));

          if (userIds.length > 0) {
            // Fetch user game publisher ID values
            const { data: userPubIdsData, error: userPubIdsError } = await supabase
              .from('game_publisher_id_for_users')
              .select('user_id, game_id, game_publisher_id, value')
              .in('user_id', userIds)
              .in('game_id', Array.from(gameIds));

            if (userPubIdsError) {
              console.error('Error fetching user game publisher IDs:', userPubIdsError);
            } else {
              // Create a map: userId_gameId -> { label, value }
              const userGamePubIdMap = new Map<string, UserGamePublisherIdMap>();
              userPubIdsData?.forEach(upid => {
                const key = `${upid.user_id}_${upid.game_id}`;
                if (!userGamePubIdMap.has(key)) {
                  userGamePubIdMap.set(key, new Map());
                }
                // Find the label for this publisher ID
                const gamePublisherIds = gamePublisherIdMap.get(upid.game_id) || [];
                const publisherIdDef = gamePublisherIds.find(p => p.id === upid.game_publisher_id);
                if (publisherIdDef) {
                  userGamePubIdMap.get(key)!.set(upid.game_publisher_id, {
                    label: publisherIdDef.label,
                    value: upid.value
                  });
                }
              });
              setAllUserGamePublisherIds(userGamePubIdMap);
            }
          }
        }
      }

      setIsLoadingTournamentFields(false);
    } catch (err) {
      console.error('Error fetching tournament fields and values:', err);
      setIsLoadingTournamentFields(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create the SQL query for debugging - Fixed to use proper JOIN syntax
      const sqlQuery = `
SELECT 
  tr.id, 
  tr.status, 
  tr.created_at,
  tr.tournament_id,
  tr.user_id,
  tr.team_id,
  t.id as tournament_id, 
  t.title as tournament_title, 
  t.type as tournament_type, 
  t.status as tournament_status, 
  t.tournament_format,
  u.id as user_id, 
  u.email as user_email,
  tm.id as team_id, 
  tm.name as team_name,
  (
    SELECT EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = tr.team_id 
      AND user_id = tr.user_id 
      AND role = 'captain'
    )
  ) as is_captain
FROM 
  tournament_registrations tr
JOIN 
  tournaments t ON tr.tournament_id = t.id
JOIN 
  users u ON tr.user_id = u.id
LEFT JOIN 
  teams tm ON tr.team_id = tm.id
WHERE 
  t.status = 'upcoming'
ORDER BY 
  tr.created_at DESC;
      `;
      
      setDebugSqlQuery(sqlQuery);
      
      // Fetch registrations with team and captain information
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          status,
          created_at,
          tournament:tournament_id(id, title, type, status, tournament_format, game_id),
          user:user_id(id, email, has_parental_consent, country, username, discord_handle),
          team:team_id(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch team members to identify which users are captains
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select('team_id, user_id, role');
        
      if (teamMembersError) throw teamMembersError;
      
      // Create a map of team captains for quick lookup
      const captainMap = new Map();
      teamMembers.forEach(member => {
        if (member.role === 'captain') {
          captainMap.set(`${member.team_id}_${member.user_id}`, true);
        }
      });

      // Add captain information to registrations
      const registrationsWithCaptainInfo = data.map(reg => ({
        ...reg,
        is_captain: reg.team && reg.user && captainMap.has(`${reg.team.id}_${reg.user.id}`)
      }));

      const filteredData = registrationsWithCaptainInfo;
      
      setRegistrations(filteredData as TournamentRegistration[]);
      setFilteredRegistrations(filteredData as TournamentRegistration[]);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Failed to load registrations');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Group registrations by tournament and team
    const grouped: Record<string, TournamentRegistration[]> = {};
    
    filteredRegistrations.forEach(reg => {
      const tournamentId = reg.tournament.id;
      if (!grouped[tournamentId]) {
        grouped[tournamentId] = [];
      }
      grouped[tournamentId].push(reg);
    });
    
    // For each tournament, sort registrations by team name
    Object.keys(grouped).forEach(tournamentId => {
      const tournamentRegs = grouped[tournamentId];
      
      // Check if this is a team tournament
      const isTeamTournament = tournamentRegs.length > 0 && tournamentRegs[0].tournament.type === 'team';
      
      if (isTeamTournament) {
        // Sort by team name first, then by captain status (captains first)
        tournamentRegs.sort((a, b) => {
          // First sort by team name
          const teamNameA = a.team?.name || '';
          const teamNameB = b.team?.name || '';
          
          if (teamNameA !== teamNameB) {
            return teamNameA.localeCompare(teamNameB);
          }
          
          // Then sort by captain status (captains first)
          return (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0);
        });
      }
      
      grouped[tournamentId] = tournamentRegs;
    });
    
    setGroupedRegistrations(grouped);
  }, [filteredRegistrations]);

  useEffect(() => {
    let filtered = [...registrations];

    if (searchTerm) {
      filtered = filtered.filter(reg =>
        reg.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reg.team?.name && reg.team.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedTournamentId) {
      filtered = filtered.filter(reg => reg.tournament.id === selectedTournamentId);
    }

    if (selectedStatus) {
      filtered = filtered.filter(reg => reg.status === selectedStatus);
    }

    setFilteredRegistrations(filtered);
  }, [searchTerm, selectedTournamentId, selectedStatus, registrations]);

  useEffect(() => {
    if (selectedTournamentId && registrationsListRef.current) {
      setTimeout(() => {
        const targetCard = tournamentCardRefs.current.get(selectedTournamentId);

        if (targetCard) {
          const offset = 100;
          const elementPosition = targetCard.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          setHighlightedTournamentId(selectedTournamentId);
          setTimeout(() => setHighlightedTournamentId(null), 2000);
        } else if (registrationsListRef.current) {
          const offset = 100;
          const elementPosition = registrationsListRef.current.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          setHighlightedTournamentId('empty-state');
          setTimeout(() => setHighlightedTournamentId(null), 2000);
        }
      }, 100);
    }
  }, [selectedTournamentId, groupedRegistrations]);

  const handleStatusChange = async (registrationId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ status: newStatus })
        .eq('id', registrationId);
        
      if (error) throw error;
      
      setRegistrations(prevState => 
        prevState.map(reg => 
          reg.id === registrationId ? { ...reg, status: newStatus } : reg
        )
      );
      
      if (newStatus === 'pending') {
        toast.success('Registration validation undone');
      } else {
        toast.success(`Registration ${newStatus}`);
      }
    } catch (err) {
      console.error(`Error updating registration status:`, err);
      toast.error('Failed to update registration status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };


  const exportAllPlayersForTournament = async (tournamentId: string) => {
    let loadingToast: string | undefined;
    try {
      // Get all registrations for this tournament
      const tournamentRegistrations = registrations.filter(
        reg => reg.tournament.id === tournamentId
      );

      if (tournamentRegistrations.length === 0) {
        toast.error('No registrations for this tournament');
        return;
      }

      // Show loading toast
      loadingToast = toast.loading('Generating CSV export...');

      // Fetch tournament details to get game_id
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (!tournament) {
        toast.dismiss(loadingToast);
        toast.error('Tournament not found');
        return;
      }

      // Fetch additional user data for all registered users
      const userIds = tournamentRegistrations.map(reg => reg.user.id);

      if (userIds.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('No users found for this tournament');
        return;
      }

      // Fetch complete user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, has_parental_consent, country, username, discord_handle')
        .in('id', userIds);

      if (userError) {
        console.error('Error fetching user data:', userError);
        throw new Error(`Failed to fetch user data: ${userError.message}`);
      }

      if (!userData || userData.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('No user data found for registered players');
        return;
      }

      // Create a map of user data for quick lookup
      const userMap = new Map();
      userData.forEach(user => {
        userMap.set(user.id, user);
      });

      // Fetch tournament custom fields
      const { data: tournamentFields, error: fieldsError } = await supabase
        .from('tournament_fields')
        .select('id, name, field_type')
        .eq('tournament_id', tournamentId)
        .order('name');

      if (fieldsError) {
        console.error('Error fetching tournament fields:', fieldsError);
        throw new Error(`Failed to fetch tournament fields: ${fieldsError.message}`);
      }

      // Fetch user tournament field values for all registered users
      const { data: userFieldValues, error: fieldValuesError } = await supabase
        .from('user_tournament_field_values')
        .select('user_id, field_id, field_index, value')
        .eq('tournament_id', tournamentId)
        .in('user_id', userIds);

      if (fieldValuesError) {
        console.error('Error fetching user field values:', fieldValuesError);
        throw new Error(`Failed to fetch user field values: ${fieldValuesError.message}`);
      }

      // Create a map of user field values: userId -> fieldId -> array of values
      const userFieldValuesMap = new Map();
      userFieldValues?.forEach(fv => {
        if (!userFieldValuesMap.has(fv.user_id)) {
          userFieldValuesMap.set(fv.user_id, new Map());
        }
        if (!userFieldValuesMap.get(fv.user_id).has(fv.field_id)) {
          userFieldValuesMap.get(fv.user_id).set(fv.field_id, []);
        }
        const parsedValue = parseFieldValue(fv.value);
        userFieldValuesMap.get(fv.user_id).get(fv.field_id).push({ index: fv.field_index, value: parsedValue });
      });

      // Fetch game publisher IDs if tournament has a game
      let gamePublisherIds: any[] = [];
      let userGamePublisherValues: any[] = [];

      if (tournament.game_id) {
        const { data: publisherIds, error: publisherIdsError } = await supabase
          .from('game_publisher_ids')
          .select('id, label, id_name')
          .eq('game_id', tournament.game_id)
          .order('label');

        if (publisherIdsError) {
          console.error('Error fetching game publisher IDs:', publisherIdsError);
          throw new Error(`Failed to fetch game publisher IDs: ${publisherIdsError.message}`);
        }
        gamePublisherIds = publisherIds || [];

        if (gamePublisherIds.length > 0) {
          const { data: userPubIds, error: userPubIdsError } = await supabase
            .from('game_publisher_id_for_users')
            .select('user_id, game_publisher_id, value')
            .eq('game_id', tournament.game_id)
            .in('user_id', userIds);

          if (userPubIdsError) {
            console.error('Error fetching user game publisher IDs:', userPubIdsError);
            throw new Error(`Failed to fetch user game publisher IDs: ${userPubIdsError.message}`);
          }
          userGamePublisherValues = userPubIds || [];
        }
      }

      // Create a map of user game publisher values: userId -> publisherId -> value
      const userPubIdsMap = new Map();
      userGamePublisherValues.forEach(upv => {
        if (!userPubIdsMap.has(upv.user_id)) {
          userPubIdsMap.set(upv.user_id, new Map());
        }
        userPubIdsMap.get(upv.user_id).set(upv.game_publisher_id, upv.value);
      });

      // Fetch team data if this is a team tournament
      const isTeamTournament = tournamentRegistrations.length > 0 &&
                              tournamentRegistrations[0].tournament.type === 'team';

      let teamData: any[] = [];
      if (isTeamTournament) {
        const teamIds = tournamentRegistrations
          .filter(reg => reg.team)
          .map(reg => reg.team!.id);

        if (teamIds.length > 0) {
          const { data: teams, error: teamError } = await supabase
            .from('teams')
            .select('id, name')
            .in('id', teamIds);

          if (teamError) {
            console.error('Error fetching team data:', teamError);
            throw new Error(`Failed to fetch team data: ${teamError.message}`);
          }
          teamData = teams || [];
        }
      }

      // Create a map of team data for quick lookup
      const teamMap = new Map();
      (teamData || []).forEach(team => {
        teamMap.set(team.id, team);
      });

      // Build CSV headers in the requested order:
      // Player ID - FieldID Values - Email - Username - Country - Registration Status - Registration Date - Game ID
      const headers = ['Player ID'];

      // Add custom field columns (FieldID Values)
      tournamentFields?.forEach(field => {
        headers.push(field.name);
      });

      // Add standard user columns
      headers.push('Email', 'Username', 'Country', 'Registration Status', 'Registration Date');

      // Add team columns if team tournament
      if (isTeamTournament) {
        headers.push('Team ID', 'Team Name', 'Is Captain');
      }

      // Add game publisher ID columns
      gamePublisherIds.forEach(pid => {
        headers.push(`Game ID: ${pid.label}`);
      });

      // Prepare CSV data with semicolon delimiter for better Excel compatibility
      const csvContent = [
        headers.join(';'),
        ...tournamentRegistrations.map(reg => {
          try {
            const user = userMap.get(reg.user.id) || reg.user;
            const team = reg.team ? (teamMap.get(reg.team.id) || reg.team) : null;

            // Build row in the requested order:
            // Player ID - FieldID Values - Email - Username - Country - Registration Status - Registration Date - Game ID
            const row = [user.id || ''];

            // Add custom field values (combine all field_index entries and JSONB keys)
            (tournamentFields || []).forEach(field => {
              const fieldValueMap = userFieldValuesMap.get(user.id);
              const fieldValues = fieldValueMap ? fieldValueMap.get(field.id) : [];

              if (fieldValues && fieldValues.length > 0) {
                // Sort by field_index
                const sortedValues = fieldValues.sort((a, b) => a.index - b.index);
                // Format each value and join with " | " separator
                const formattedValues = sortedValues.map(fv => formatFieldValueForDisplay(fv.value));
                row.push(formattedValues.join(' | '));
              } else {
                row.push('');
              }
            });

            // Add standard user columns
            row.push(
              user.email || '',
              user.username || '',
              user.country || '',
              reg.status || '',
              reg.created_at ? formatDateWithTime(reg.created_at) : ''
            );

            // Add team data if team tournament
            if (isTeamTournament) {
              row.push(
                team?.id || '',
                team?.name || '',
                reg.is_captain ? 'Yes' : 'No'
              );
            }

            // Add game publisher ID values
            gamePublisherIds.forEach(pid => {
              const pubIdMap = userPubIdsMap.get(user.id);
              const pubIdValue = pubIdMap ? pubIdMap.get(pid.id) : '';
              row.push(pubIdValue || '');
            });

            return row.map(item => {
              const value = item != null ? String(item) : '';
              return `"${value.replace(/"/g, '""')}"`;
            }).join(';');
          } catch (rowError) {
            console.error('Error processing registration row:', reg, rowError);
            return '';
          }
        }).filter(row => row !== '')
      ].join('\n');

      // Generate and download the CSV file
      const tournamentName = tournament.title ? tournament.title.replace(/[^a-zA-Z0-9]/g, '_') : 'tournament';
      const dateStr = new Date().toISOString().split('T')[0];

      // Add UTF-8 BOM for better Excel compatibility
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `registrations_${tournamentName}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast.dismiss(loadingToast);
      toast.success(`${tournamentRegistrations.length} player${tournamentRegistrations.length > 1 ? 's' : ''} exported successfully`);
    } catch (err) {
      console.error('Error exporting players:', err);
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to export players';
      toast.error(errorMessage);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      setIsLoadingTeamMembers(true);
      
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          user:user_id (
            email,
            username
          )
        `)
        .eq('team_id', teamId);
        
      if (error) throw error;
      
      setTeamMembers(data as TeamMember[]);
    } catch (err) {
      console.error('Error fetching team members:', err);
      toast.error('Failed to load team members');
      setTeamMembers([]);
    } finally {
      setIsLoadingTeamMembers(false);
    }
  };

  const handleViewPlayerDetails = async (registration: TournamentRegistration) => {
    setSelectedRegistration(registration);
    setIsPlayerDetailsModalOpen(true);
    
    try {
      setIsLoadingFields(true);
      setIsLoadingPublisherIds(true);
      
      // If this is a team registration, fetch team members
      if (registration.team) {
        fetchTeamMembers(registration.team.id);
      } else {
        setTeamMembers([]);
      }
      
      // Fetch user tournament field values
      const { data, error } = await supabase
        .from('user_tournament_field_values')
        .select(`
          id,
          user_id,
          tournament_id,
          field_id,
          field_index,
          value,
          field:field_id(id, name, field_type)
        `)
        .eq('user_id', registration.user.id)
        .eq('tournament_id', registration.tournament.id)
        .order('field_index', { ascending: true });
        
      if (error) throw error;
      
      setUserFieldValues(data as UserTournamentFieldValue[]);
      
      // If the tournament has a game, fetch the user's game publisher IDs
      if (registration.tournament.game_id) {
        // First get the game publisher ID types for this game
        const { data: publisherIdTypes, error: publisherIdTypesError } = await supabase
          .from('game_publisher_ids')
          .select('id')
          .eq('game_id', registration.tournament.game_id);
          
        if (publisherIdTypesError) throw publisherIdTypesError;
        
        if (publisherIdTypes && publisherIdTypes.length > 0) {
          // Then get the user's values for these publisher ID types
          const { data: userPublisherIds, error: userPublisherIdsError } = await supabase
            .from('game_publisher_id_for_users')
            .select(`
              id,
              user_id,
              game_id,
              game_publisher_id,
              value,
              created_at,
              publisher_id:game_publisher_id(
                label,
                id_name
              )
            `)
            .eq('user_id', registration.user.id)
            .eq('game_id', registration.tournament.game_id);
            
          if (userPublisherIdsError) throw userPublisherIdsError;
          
          setUserGamePublisherIds(userPublisherIds as GamePublisherId[] || []);
        } else {
          setUserGamePublisherIds([]);
        }
      } else {
        setUserGamePublisherIds([]);
      }
      
      setIsLoadingFields(false);
      setIsLoadingPublisherIds(false);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setIsLoadingFields(false);
      setIsLoadingPublisherIds(false);
      setUserFieldValues([]);
      setUserGamePublisherIds([]);
    }
  };

  const canGenerateBracket = (tournament: any) => {
    const now = new Date();
    const registrationEndDate = tournament.registration_end_date ? new Date(tournament.registration_end_date) : null;
    return registrationEndDate && now > registrationEndDate;
  };

  const handleGenerateBracket = (tournament: any) => {
    if (tournament.tournament_format === 'Round Swiss') {
      navigate(`/tournaments/${tournament.id}/swiss-bracket`);
    } else {
      navigate(`/tournaments/${tournament.id}/bracket`);
    }
  };

  const handleLaunchBracketClick = (tournament: any) => {
    setSelectedTournamentForLaunch(tournament);
    setIsBracketLaunchModalOpen(true);
  };

  const handleConfirmLaunchBracket = async () => {
    if (!selectedTournamentForLaunch) return;

    try {
      setIsLaunchingBracket(true);

      const tournamentRegs = registrations.filter(
        reg => reg.tournament.id === selectedTournamentForLaunch.id && reg.status === 'approved'
      );
      const approvedCount = tournamentRegs.length;

      const { calculateBracketStructure } = await import('../utils/tournamentValidation');
      const bracketStructure = calculateBracketStructure(
        approvedCount,
        selectedTournamentForLaunch.tournament_format,
        selectedTournamentForLaunch.max_nb_players
      );

      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          initial_max_players: selectedTournamentForLaunch.max_nb_players || approvedCount,
          actual_participants: approvedCount,
          max_nb_players: approvedCount,
          registration_locked: true,
          bracket_launched_at: new Date().toISOString(),
          bracket_size: bracketStructure.bracketSize,
          bracket_byes_count: bracketStructure.byes,
          uses_lucky_loser: true
        })
        .eq('id', selectedTournamentForLaunch.id);

      if (updateError) throw updateError;

      toast.success('Le tournoi a été préparé pour le lancement!');
      setIsBracketLaunchModalOpen(false);
      setSelectedTournamentForLaunch(null);

      await fetchTournaments();

      if (selectedTournamentForLaunch.tournament_format?.includes('Round Robin')) {
        navigate(`/tournaments/${selectedTournamentForLaunch.id}/rr-bracket`);
      } else if (selectedTournamentForLaunch.tournament_format?.includes('Swiss')) {
        navigate(`/tournaments/${selectedTournamentForLaunch.id}/swiss-bracket`);
      } else {
        navigate(`/tournaments/${selectedTournamentForLaunch.id}/bracket`);
      }
    } catch (err) {
      console.error('Error launching bracket:', err);
      toast.error('Échec du lancement du bracket');
    } finally {
      setIsLaunchingBracket(false);
    }
  };

  const canLaunchBracket = (tournament: any) => {
    if (tournament.bracket_launched_at) return false;
    if (tournament.registration_locked) return false;

    const tournamentRegs = registrations.filter(
      reg => reg.tournament.id === tournament.id && reg.status === 'approved'
    );

    const validation = validateTournamentLaunch(
      tournamentRegs.length,
      tournament.tournament_format,
      tournament.max_nb_players,
      tournament.type
    );

    return validation.isValid;
  };

  const getUserFieldValue = (userId: string, tournamentId: string, fieldId: string): string => {
    const key = `${userId}_${tournamentId}`;
    const userValues = allUserFieldValues.get(key);
    if (!userValues) return '';

    const fieldValues = userValues.get(fieldId);
    if (!fieldValues || fieldValues.length === 0) return '';

    // Sort by index and format all values
    const sortedValues = fieldValues.sort((a, b) => a.index - b.index);
    return sortedValues.map(v => formatFieldValueForDisplay(v.value)).join(' | ');
  };

  const getUserGamePublisherId = (userId: string, gameId: string | null | undefined): string => {
    if (!gameId) {
      return '';
    }
    const key = `${userId}_${gameId}`;
    const userGamePubIds = allUserGamePublisherIds.get(key);

    if (!userGamePubIds || userGamePubIds.size === 0) {
      return '';
    }

    const entries = Array.from(userGamePubIds.values());
    const result = entries.map(entry => `${entry.label}: ${entry.value}`).join(' | ');
    return result;
  };

  const getUserGamePublisherIdArray = (userId: string, gameId: string | null | undefined): Array<{label: string, value: string}> => {
    if (!gameId) {
      return [];
    }
    const key = `${userId}_${gameId}`;
    const userGamePubIds = allUserGamePublisherIds.get(key);

    if (!userGamePubIds || userGamePubIds.size === 0) {
      return [];
    }

    const result = Array.from(userGamePubIds.values());
    return result;
  };

  const shouldShowDiscordColumn = (tournamentRegs: TournamentRegistration[]): boolean => {
    return tournamentRegs.some(reg => reg.user.discord_handle);
  };

  const shouldShowGamePublisherIdColumn = (tournamentId: string, tournamentRegs: TournamentRegistration[]): boolean => {
    const tournament = allTournaments.find(t => t.id === tournamentId);

    if (!tournament?.game_id) {
      return false;
    }

    const result = tournamentRegs.some(reg => {
      const pubId = getUserGamePublisherId(reg.user.id, tournament.game_id);
      return pubId !== '';
    });

    return result;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search registrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="w-full md:w-48">
            <Select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              options={[
                { value: '', label: 'All Tournaments' },
                ...allTournaments.map(t => ({
                  value: t.id,
                  label: t.title
                }))
              ]}
              leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
            />
          </div>

          <div className="w-full md:w-36">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]}
              leftIcon={<Filter className="h-5 w-5 text-gray-400" />}
            />
          </div>

        </div>
      </div>

      <div className="flex items-center justify-center border-b border-gray-200 dark:border-dark-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setRegistrationStatusFilter('open')}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              registrationStatusFilter === 'open'
                ? 'text-success-600 dark:text-success-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Inscriptions ouvertes ({statusCounts.open})
            {registrationStatusFilter === 'open' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-success-500"></div>
            )}
          </button>
          <button
            onClick={() => setRegistrationStatusFilter('closed')}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              registrationStatusFilter === 'closed'
                ? 'text-error-600 dark:text-error-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Inscriptions fermées ({statusCounts.closed})
            {registrationStatusFilter === 'closed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-error-500"></div>
            )}
          </button>
          <button
            onClick={() => setRegistrationStatusFilter('all')}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              registrationStatusFilter === 'all'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Tous les tournois ({statusCounts.all})
            {registrationStatusFilter === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"></div>
            )}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTournaments.map(tournament => {
          const tournamentRegistrations = registrations.filter(
            reg => reg.tournament.id === tournament.id
          );
          
          const pending = tournamentRegistrations.filter(r => r.status === 'pending').length;
          const approved = tournamentRegistrations.filter(r => r.status === 'approved').length;
          const rejected = tournamentRegistrations.filter(r => r.status === 'rejected').length;
          const total = tournamentRegistrations.length;
          
          return (
            <Card key={tournament.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{tournament.title}</h3>
                    <div className="flex items-center mt-1 space-x-2 flex-wrap gap-y-1">
                      <Badge variant={tournament.type === 'solo' ? 'accent' : 'secondary'}>
                        {tournament.type === 'solo' ? 'Solo' : 'Team'}
                      </Badge>
                      {tournament.tournament_format && (
                        <Badge variant="primary">
                          {tournament.tournament_format}
                        </Badge>
                      )}
                      {isRegistrationOpen(tournament) ? (
                        <Badge variant="success">
                          Inscriptions ouvertes
                        </Badge>
                      ) : (
                        <Badge variant="error">
                          Inscriptions fermées
                        </Badge>
                      )}
                      {tournament.registration_end_date && (
                        <Badge variant="default">
                          Fin: {formatDateWithTime(tournament.registration_end_date)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {tournament.bracket_launched_at ? (
                      <Button
                        size="sm"
                        leftIcon={<Trophy size={14} />}
                        onClick={() => handleGenerateBracket(tournament)}
                        title="View tournament bracket"
                        variant="primary"
                      >
                        View Bracket
                      </Button>
                    ) : canLaunchBracket(tournament) ? (
                      <Button
                        size="sm"
                        leftIcon={<Rocket size={14} />}
                        onClick={() => handleLaunchBracketClick(tournament)}
                        title="Launch tournament bracket"
                        className="bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700"
                      >
                        Launch Bracket
                      </Button>
                    ) : null}
                    {canGenerateReports() && (
                      <Button
                        size="sm"
                        leftIcon={<Download size={14} />}
                        disabled={total === 0}
                        onClick={() => {
                          setSelectedTournamentForExport(tournament);
                          setIsCSVExportModalOpen(true);
                        }}
                        title="Customize and export player data"
                        variant="secondary"
                      >
                        Export Players
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-white font-medium">Registrations</span>
                      <span className="text-sm font-medium text-white">{total} players</span>
                    </div>
                    
                    {total > 0 ? (
                      <div className="w-full bg-gray-200 dark:bg-dark-200 h-2.5 rounded-full overflow-hidden">
                        <div className="flex h-full">
                          <div 
                            className="bg-success-500 h-full" 
                            style={{ width: `${(approved / total) * 100}%` }}
                          ></div>
                          <div 
                            className="bg-warning-500 h-full" 
                            style={{ width: `${(pending / total) * 100}%` }}
                          ></div>
                          <div 
                            className="bg-error-500 h-full" 
                            style={{ width: `${(rejected / total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full bg-gray-200 dark:bg-dark-200 h-2.5 rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <div className="flex items-center text-sm">
                      <div className="w-3 h-3 rounded-full bg-success-500 mr-1.5"></div>
                      <span className="text-success-700 dark:text-success-400 font-medium">{approved} Approved</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-3 h-3 rounded-full bg-warning-500 mr-1.5"></div>
                      <span className="text-warning-700 dark:text-warning-400 font-medium">{pending} Pending</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-3 h-3 rounded-full bg-error-500 mr-1.5"></div>
                      <span className="text-error-700 dark:text-error-400 font-medium">{rejected} Rejected</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <a
                    href="#registrations-list"
                    onClick={() => {
                      setSelectedTournamentId(tournament.id);
                    }}
                    className="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-md transition-colors cursor-pointer"
                  >
                    View Registrations
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div id="registrations-list" ref={registrationsListRef}>
        {Object.entries(groupedRegistrations).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedRegistrations).map(([tournamentId, regs]) => {
            const tournament = allTournaments.find(t => t.id === tournamentId);

            if (!tournament) return null;

            const matchesFilter = filteredTournaments.some(t => t.id === tournamentId);
            if (!matchesFilter) return null;
            
            return (
              <Card
                key={tournamentId}
                ref={(el) => {
                  if (el) {
                    tournamentCardRefs.current.set(tournamentId, el);
                  } else {
                    tournamentCardRefs.current.delete(tournamentId);
                  }
                }}
                className={highlightedTournamentId === tournamentId ? 'animate-highlight' : ''}
              >
                <CardHeader className="border-b border-gray-200 dark:border-dark-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center">
                        <span>{tournament.title}</span>
                        <Badge 
                          variant={tournament.type === 'solo' ? 'accent' : 'secondary'}
                          className="ml-2"
                        >
                          {tournament.type === 'solo' ? 'Solo' : 'Team'}
                        </Badge>
                        {tournament.tournament_format && (
                          <Badge variant="primary" className="ml-2">
                            {tournament.tournament_format}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {regs.length} registration{regs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {canGenerateReports() && (
                      <Button
                        size="sm"
                        leftIcon={<Download size={16} />}
                        onClick={() => {
                          const tournament = allTournaments.find(t => t.id === tournamentId);
                          if (tournament) {
                            setSelectedTournamentForExport(tournament);
                            setIsCSVExportModalOpen(true);
                          }
                        }}
                        disabled={regs.length === 0}
                      >
                        Export All Players
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player Email</TableHead>
                        {shouldShowGamePublisherIdColumn(tournamentId, regs) && <TableHead>Game Publisher IDs</TableHead>}
                        {shouldShowDiscordColumn(regs) && <TableHead>Discord ID</TableHead>}
                        {tournament.type === 'team' && <TableHead>Team</TableHead>}
                        {tournamentFields.get(tournamentId)?.map(field => (
                          <TableHead key={field.id}>{field.name}</TableHead>
                        ))}
                        <TableHead>Status</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regs.map((registration) => (
                        <TableRow
                          key={registration.id}
                          className={registration.is_captain ? "bg-primary-900/10 border-l-4 border-primary-500" : ""}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              {registration.user.email}
                              {registration.is_captain && (
                                <Shield className="h-4 w-4 text-blue-500 ml-2" title="Team Captain" />
                              )}
                            </div>
                          </TableCell>
                          {shouldShowGamePublisherIdColumn(tournamentId, regs) && (
                            <TableCell>
                              <div className="text-sm text-gray-700 dark:text-gray-300 max-w-xs space-y-1">
                                {getUserGamePublisherIdArray(registration.user.id, tournament.game_id).length > 0 ? (
                                  getUserGamePublisherIdArray(registration.user.id, tournament.game_id).map((pid, idx) => (
                                    <div key={idx} className="flex items-baseline">
                                      <span className="font-medium mr-2">{pid.label}:</span>
                                      <span className="text-primary-600 dark:text-primary-400 break-words flex-1">{pid.value}</span>
                                    </div>
                                  ))
                                ) : '-'}
                              </div>
                            </TableCell>
                          )}
                          {shouldShowDiscordColumn(regs) && (
                            <TableCell>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {registration.user.discord_handle || '-'}
                              </span>
                            </TableCell>
                          )}
                          {tournament.type === 'team' && (
                            <TableCell>
                              {registration.team ? (
                                <div className="flex items-center">
                                  <span className="font-medium text-secondary-400">
                                    {registration.team.name}
                                  </span>
                                  {registration.is_captain && (
                                    <Badge variant="primary" className="ml-2 text-xs">Captain</Badge>
                                  )}
                                </div>
                              ) : 'N/A'}
                            </TableCell>
                          )}
                          {tournamentFields.get(tournamentId)?.map(field => (
                            <TableCell key={field.id}>
                              <span className="text-sm text-gray-700 dark:text-gray-300" title={getUserFieldValue(registration.user.id, tournamentId, field.id)}>
                                {getUserFieldValue(registration.user.id, tournamentId, field.id) || '-'}
                              </span>
                            </TableCell>
                          ))}
                          <TableCell>{getStatusBadge(registration.status)}</TableCell>
                          <TableCell>{formatDateWithTime(registration.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              {registration.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Approve"
                                    onClick={() => handleStatusChange(registration.id, 'approved')}
                                    className="text-success-500 hover:text-success-600"
                                  >
                                    <CheckCircle size={16} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Reject"
                                    onClick={() => handleStatusChange(registration.id, 'rejected')}
                                    className="text-error-500 hover:text-error-600"
                                  >
                                    <XCircle size={16} />
                                  </Button>
                                </>
                              )}
                              {registration.status === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Undo Validation"
                                  onClick={() => handleStatusChange(registration.id, 'pending')}
                                  className="text-warning-500 hover:text-warning-600"
                                >
                                  <RotateCcw size={16} />
                                </Button>
                              )}
                              {registration.status === 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Undo Rejection"
                                  onClick={() => handleStatusChange(registration.id, 'pending')}
                                  className="text-warning-500 hover:text-warning-600"
                                >
                                  <RotateCcw size={16} />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                title="View Details"
                                onClick={() => handleViewPlayerDetails(registration)}
                              >
                                <Eye size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className={highlightedTournamentId === 'empty-state' ? 'animate-highlight' : ''}>
          <CardContent className="py-12 text-center">
            {isLoading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
              </div>
            ) : error ? (
              <p className="text-error-500">{error}</p>
            ) : selectedTournamentId ? (
              <p className="text-gray-500 dark:text-gray-400">Pas encore d'inscrits pour ce tournoi</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No registrations match your filters</p>
            )}
          </CardContent>
        </Card>
      )}
      </div>

      <Modal
        isOpen={isPlayerDetailsModalOpen}
        onClose={() => setIsPlayerDetailsModalOpen(false)}
        title="Player Registration Details"
        size="lg"
      >
        {selectedRegistration && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Player Information</h3>
                <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-dark-200 p-4 rounded-md">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Player Email</p>
                    <div className="flex items-start gap-2">
                      <p
                        className="font-medium text-primary-600 dark:text-primary-400 whitespace-nowrap overflow-hidden text-ellipsis flex-1"
                        title={selectedRegistration.user.email}
                      >
                        {selectedRegistration.user.email}
                      </p>
                      {selectedRegistration.is_captain && (
                        <Shield className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" title="Team Captain" />
                      )}
                    </div>
                  </div>

                  {selectedRegistration.user.discord_handle && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Discord ID</p>
                      <p className="font-medium text-primary-600 dark:text-primary-400 break-words">
                        {selectedRegistration.user.discord_handle}
                      </p>
                    </div>
                  )}
                </div>

                {selectedRegistration.tournament.type === 'team' && selectedRegistration.team && (
                  <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-md mt-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Team</p>
                      <div className="flex items-center">
                        <p className="font-medium text-primary-600 dark:text-primary-400">
                          {selectedRegistration.team.name}
                        </p>
                        {selectedRegistration.is_captain && (
                          <Badge variant="primary" className="ml-2">Captain</Badge>
                        )}
                      </div>
                      
                      {/* Team Members Section */}
                      <div className="mt-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Team Members</p>
                        {isLoadingTeamMembers ? (
                          <div className="flex items-center justify-center py-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                            <span className="text-sm text-gray-400">Loading team members...</span>
                          </div>
                        ) : teamMembers.length > 0 ? (
                          <div className="bg-dark-300 rounded-md overflow-hidden">
                            <table className="min-w-full divide-y divide-dark-200">
                              <thead className="bg-dark-400">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Role</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Email</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-dark-200">
                                {teamMembers.map(member => (
                                  <tr key={member.id} className={member.role === 'captain' ? 'bg-primary-900/20' : ''}>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      {member.role === 'captain' ? (
                                        <div className="flex items-center">
                                          <Shield className="h-4 w-4 text-blue-500 mr-1" />
                                          <span className="text-sm font-medium text-blue-400">Captain</span>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-gray-300">Member</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                                      {member.user.email}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No team members found</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-md mt-4">
                  {/* Display Game Publisher IDs if available */}
                  {isLoadingPublisherIds ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                      <span className="text-gray-500 dark:text-gray-400">Loading game IDs...</span>
                    </div>
                  ) : userGamePublisherIds.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Game Publisher IDs</p>
                      <div className="space-y-2">
                        {userGamePublisherIds.map(pid => (
                          <div key={pid.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                              {pid.publisher_id.label}:
                            </span>
                            <span className="font-mono text-primary-600 dark:text-primary-400 break-words">
                              {pid.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isLoadingPublisherIds && userGamePublisherIds.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No game publisher IDs found</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Tournament Information</h3>
                <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-md space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tournament</p>
                    <p className="font-medium text-primary-600 dark:text-primary-400">{selectedRegistration.tournament.title}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[150px]">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                      <p>
                        <Badge variant={selectedRegistration.tournament.type === 'solo' ? 'accent' : 'secondary'}>
                          {selectedRegistration.tournament.type === 'solo' ? 'Solo' : 'Team'}
                        </Badge>
                      </p>
                    </div>
                    
                    {selectedRegistration.tournament.tournament_format && (
                      <div className="flex-1 min-w-[150px]">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Format</p>
                        <p>
                          <Badge variant="primary">
                            {selectedRegistration.tournament.tournament_format}
                          </Badge>
                        </p>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-[150px]">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <p>{getStatusBadge(selectedRegistration.status)}</p>
                    </div>
                    
                    <div className="flex-1 min-w-[150px]">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Registration Date</p>
                      <p className="text-primary-600 dark:text-primary-400">{formatDateWithTime(selectedRegistration.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {isLoadingFields ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                </div>
              ) : userFieldValues.length > 0 ? (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">User Tournament Info</h3>
                  <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userFieldValues.map(fieldValue => {
                        const parsedValue = formatFieldValueForModal(fieldValue.value);
                        return (
                          <div key={fieldValue.id} className="space-y-2">
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                              {fieldValue.field.name} {fieldValue.field_index > 1 ? `(Entry ${fieldValue.field_index})` : ''}
                            </p>
                            <div className="ml-4 space-y-1">
                              {parsedValue.map((item, idx) => (
                                <div key={idx} className="flex items-baseline">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-2">
                                    {item.key}:
                                  </span>
                                  <span className="font-medium text-primary-600 dark:text-primary-400 break-words flex-1">
                                    {item.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">User Tournament Info</h3>
                  <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-md text-center">
                    <p className="text-gray-500 dark:text-gray-400">No user-specific tournament info found for this player</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons at the bottom */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-200">
              {selectedRegistration.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      handleStatusChange(selectedRegistration.id, 'rejected');
                      setIsPlayerDetailsModalOpen(false);
                    }}
                    leftIcon={<XCircle size={16} />}
                  >
                    Reject Registration
                  </Button>
                  <Button
                    onClick={() => {
                      handleStatusChange(selectedRegistration.id, 'approved');
                      setIsPlayerDetailsModalOpen(false);
                    }}
                    leftIcon={<CheckCircle size={16} />}
                    className="bg-success-600 hover:bg-success-700 text-white"
                  >
                    Validate Registration
                  </Button>
                </>
              )}
              {selectedRegistration.status === 'approved' && (
                <Button
                  variant="warning"
                  onClick={() => {
                    handleStatusChange(selectedRegistration.id, 'pending');
                    setIsPlayerDetailsModalOpen(false);
                  }}
                  leftIcon={<RotateCcw size={16} />}
                >
                  Undo Validation
                </Button>
              )}
              {selectedRegistration.status === 'rejected' && (
                <Button
                  variant="warning"
                  onClick={() => {
                    handleStatusChange(selectedRegistration.id, 'pending');
                    setIsPlayerDetailsModalOpen(false);
                  }}
                  leftIcon={<RotateCcw size={16} />}
                >
                  Undo Rejection
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {selectedTournamentForLaunch && (
        <BracketLaunchModal
          isOpen={isBracketLaunchModalOpen}
          onClose={() => {
            setIsBracketLaunchModalOpen(false);
            setSelectedTournamentForLaunch(null);
          }}
          onConfirm={handleConfirmLaunchBracket}
          validation={validateTournamentLaunch(
            registrations.filter(
              reg => reg.tournament.id === selectedTournamentForLaunch.id && reg.status === 'approved'
            ).length,
            selectedTournamentForLaunch.tournament_format,
            selectedTournamentForLaunch.max_nb_players,
            selectedTournamentForLaunch.type
          )}
          tournamentTitle={selectedTournamentForLaunch.title}
          participantCount={
            registrations.filter(
              reg => reg.tournament.id === selectedTournamentForLaunch.id && reg.status === 'approved'
            ).length
          }
          pendingCount={
            registrations.filter(
              reg => reg.tournament.id === selectedTournamentForLaunch.id && reg.status === 'pending'
            ).length
          }
          rejectedCount={
            registrations.filter(
              reg => reg.tournament.id === selectedTournamentForLaunch.id && reg.status === 'rejected'
            ).length
          }
          initialMaxPlayers={selectedTournamentForLaunch.max_nb_players}
          tournamentType={selectedTournamentForLaunch.type}
          isLoading={isLaunchingBracket}
        />
      )}

      {selectedTournamentForExport && (
        <CSVExportModal
          isOpen={isCSVExportModalOpen}
          onClose={() => {
            setIsCSVExportModalOpen(false);
            setSelectedTournamentForExport(null);
          }}
          tournamentId={selectedTournamentForExport.id}
          tournamentData={{
            id: selectedTournamentForExport.id,
            title: selectedTournamentForExport.title,
            type: selectedTournamentForExport.type,
            game_id: selectedTournamentForExport.game_id,
          }}
          playerCount={
            registrations.filter(
              reg => reg.tournament.id === selectedTournamentForExport.id
            ).length
          }
          onExport={async (selectedFields) => {
            await exportPlayersToCSV({
              tournamentId: selectedTournamentForExport.id,
              selectedFields,
              registrations,
              tournament: selectedTournamentForExport,
              tournaments: allTournaments,
            });
          }}
        />
      )}
    </div>
  );
};

export default RegistrationsPage;