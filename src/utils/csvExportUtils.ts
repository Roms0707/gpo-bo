import { supabase } from '../lib/supabase';
import { formatDateWithTime } from './dateUtils';
import { parseFieldValue, formatFieldValueForDisplay } from './fieldValueUtils';
import toast from 'react-hot-toast';

interface ExportOptions {
  tournamentId: string;
  selectedFields: string[];
  registrations: any[];
  tournament: any;
  tournaments: any[];
}

export const exportPlayersToCSV = async ({
  tournamentId,
  selectedFields,
  registrations,
  tournament,
  tournaments,
}: ExportOptions): Promise<void> => {
  let loadingToast: string | undefined;

  try {
    const tournamentRegistrations = registrations.filter(
      (reg) => reg.tournament.id === tournamentId
    );

    if (tournamentRegistrations.length === 0) {
      toast.error('No registrations for this tournament');
      return;
    }

    loadingToast = toast.loading('Generating CSV export...');

    const tournamentData = tournaments.find((t) => t.id === tournamentId) || tournament;
    if (!tournamentData) {
      toast.dismiss(loadingToast);
      toast.error('Tournament not found');
      return;
    }

    const userIds = tournamentRegistrations.map((reg) => reg.user.id);

    if (userIds.length === 0) {
      toast.dismiss(loadingToast);
      toast.error('No users found for this tournament');
      return;
    }

    const selectFields = buildUserSelectFields(selectedFields);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(selectFields)
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

    const userMap = new Map();
    userData.forEach((user) => {
      userMap.set(user.id, user);
    });

    const needsTournamentFields = selectedFields.some((f) => f.startsWith('tournament_field_'));
    let tournamentFields: any[] = [];
    let userFieldValuesMap = new Map();

    if (needsTournamentFields) {
      const { data: tourFields, error: fieldsError } = await supabase
        .from('tournament_fields')
        .select('id, name, field_type, tournament_id')
        .or(`tournament_id.eq.${tournamentId},tournament_id.is.null`)
        .order('name');

      if (fieldsError) {
        console.error('Error fetching tournament fields:', fieldsError);
        throw new Error(`Failed to fetch tournament fields: ${fieldsError.message}`);
      }

      tournamentFields = tourFields || [];

      const { data: userFieldValues, error: fieldValuesError } = await supabase
        .from('user_tournament_field_values')
        .select('user_id, field_id, field_index, value')
        .eq('tournament_id', tournamentId)
        .in('user_id', userIds);

      if (fieldValuesError) {
        console.error('Error fetching user field values:', fieldValuesError);
        throw new Error(`Failed to fetch user field values: ${fieldValuesError.message}`);
      }

      userFieldValues?.forEach((fv) => {
        if (!userFieldValuesMap.has(fv.user_id)) {
          userFieldValuesMap.set(fv.user_id, new Map());
        }
        if (!userFieldValuesMap.get(fv.user_id).has(fv.field_id)) {
          userFieldValuesMap.get(fv.user_id).set(fv.field_id, []);
        }
        const parsedValue = parseFieldValue(fv.value);
        userFieldValuesMap
          .get(fv.user_id)
          .get(fv.field_id)
          .push({ index: fv.field_index, value: parsedValue });
      });
    }

    const needsGamePublisherIds = selectedFields.some((f) => f.startsWith('game_publisher_id_'));
    let gamePublisherIds: any[] = [];
    let userPubIdsMap = new Map();

    if (needsGamePublisherIds && tournamentData.game_id) {
      const { data: publisherIds, error: publisherIdsError } = await supabase
        .from('game_publisher_ids')
        .select('id, label, id_name')
        .eq('game_id', tournamentData.game_id)
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
          .eq('game_id', tournamentData.game_id)
          .in('user_id', userIds);

        if (userPubIdsError) {
          console.error('Error fetching user game publisher IDs:', userPubIdsError);
          throw new Error(`Failed to fetch user game publisher IDs: ${userPubIdsError.message}`);
        }

        (userPubIds || []).forEach((upv) => {
          if (!userPubIdsMap.has(upv.user_id)) {
            userPubIdsMap.set(upv.user_id, new Map());
          }
          userPubIdsMap.get(upv.user_id).set(upv.game_publisher_id, upv.value);
        });
      }
    }

    const needsTeamData =
      tournamentData.type === 'team' &&
      selectedFields.some((f) => f === 'team_id' || f === 'team_name' || f === 'is_captain');
    let teamMap = new Map();

    if (needsTeamData) {
      const teamIds = tournamentRegistrations.filter((reg) => reg.team).map((reg) => reg.team!.id);

      if (teamIds.length > 0) {
        const { data: teams, error: teamError } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds);

        if (teamError) {
          console.error('Error fetching team data:', teamError);
          throw new Error(`Failed to fetch team data: ${teamError.message}`);
        }
        (teams || []).forEach((team) => {
          teamMap.set(team.id, team);
        });
      }
    }

    const headers = buildCSVHeaders(
      selectedFields,
      tournamentFields,
      gamePublisherIds,
      tournamentData.type
    );

    const csvContent = [
      headers.join(';'),
      ...tournamentRegistrations.map((reg) => {
        try {
          const user = userMap.get(reg.user.id) || reg.user;
          const team = reg.team ? teamMap.get(reg.team.id) || reg.team : null;

          const row = buildCSVRow(
            selectedFields,
            user,
            reg,
            team,
            tournamentFields,
            userFieldValuesMap,
            gamePublisherIds,
            userPubIdsMap
          );

          return row
            .map((item) => {
              const value = item != null ? String(item) : '';
              return `"${value.replace(/"/g, '""')}"`;
            })
            .join(';');
        } catch (rowError) {
          console.error('Error processing registration row:', reg, rowError);
          return '';
        }
      }).filter((row) => row !== ''),
    ].join('\n');

    const tournamentName = tournamentData.title
      ? tournamentData.title.replace(/[^a-zA-Z0-9]/g, '_')
      : 'tournament';
    const dateStr = new Date().toISOString().split('T')[0];

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

    setTimeout(() => URL.revokeObjectURL(url), 100);

    toast.dismiss(loadingToast);
    toast.success(
      `${tournamentRegistrations.length} player${tournamentRegistrations.length > 1 ? 's' : ''} exported successfully`
    );
  } catch (err) {
    console.error('Error exporting players:', err);
    if (loadingToast) {
      toast.dismiss(loadingToast);
    }
    const errorMessage = err instanceof Error ? err.message : 'Failed to export players';
    toast.error(errorMessage);
  }
};

const buildUserSelectFields = (selectedFields: string[]): string => {
  const baseFields = ['id'];
  const userFields = [
    'email',
    'username',
    'country',
    'discord_handle',
    'has_parental_consent',
    'date_of_birth',
    'msisdn',
    'bio',
    'twitter_handle',
    'steam_id',
    'freefire_nickname',
    'ow2_battle_net_id',
    'fc26_ea_id',
    'apex_legends_ea_id',
    'fortnite_epic_id',
    'rocket_league_epic_id',
    'warzone_activision_id',
    'r6_ubisoft_id',
    'riot_game_name',
    'riot_tagline',
  ];

  const fieldsToSelect = baseFields.concat(
    userFields.filter((field) => selectedFields.includes(field))
  );

  return fieldsToSelect.join(', ');
};

const buildCSVHeaders = (
  selectedFields: string[],
  tournamentFields: any[],
  gamePublisherIds: any[],
  tournamentType: 'solo' | 'team'
): string[] => {
  const headers: string[] = [];

  selectedFields.forEach((field) => {
    if (field === 'player_id') {
      headers.push('Player ID');
    } else if (field === 'email') {
      headers.push('Email');
    } else if (field === 'username') {
      headers.push('Username');
    } else if (field === 'country') {
      headers.push('Country');
    } else if (field === 'registration_status') {
      headers.push('Registration Status');
    } else if (field === 'registration_date') {
      headers.push('Registration Date');
    } else if (field === 'discord_handle') {
      headers.push('Discord Handle');
    } else if (field === 'has_parental_consent') {
      headers.push('Parental Consent');
    } else if (field === 'date_of_birth') {
      headers.push('Date of Birth');
    } else if (field === 'msisdn') {
      headers.push('Phone Number');
    } else if (field === 'bio') {
      headers.push('Bio');
    } else if (field === 'twitter_handle') {
      headers.push('Twitter Handle');
    } else if (field === 'steam_id') {
      headers.push('Steam ID');
    } else if (field === 'freefire_nickname') {
      headers.push('Free Fire Nickname');
    } else if (field === 'ow2_battle_net_id') {
      headers.push('Overwatch 2 Battle.net ID');
    } else if (field === 'fc26_ea_id') {
      headers.push('FC26 EA ID');
    } else if (field === 'apex_legends_ea_id') {
      headers.push('Apex Legends EA ID');
    } else if (field === 'fortnite_epic_id') {
      headers.push('Fortnite Epic ID');
    } else if (field === 'rocket_league_epic_id') {
      headers.push('Rocket League Epic ID');
    } else if (field === 'warzone_activision_id') {
      headers.push('Warzone Activision ID');
    } else if (field === 'r6_ubisoft_id') {
      headers.push('Rainbow Six Ubisoft ID');
    } else if (field === 'riot_game_name') {
      headers.push('Riot Game Name');
    } else if (field === 'riot_tagline') {
      headers.push('Riot Tagline');
    } else if (field === 'team_id') {
      headers.push('Team ID');
    } else if (field === 'team_name') {
      headers.push('Team Name');
    } else if (field === 'is_captain') {
      headers.push('Is Captain');
    } else if (field.startsWith('tournament_field_')) {
      const fieldId = field.replace('tournament_field_', '');
      const tournamentField = tournamentFields.find((f) => f.id === fieldId);
      if (tournamentField) {
        headers.push(tournamentField.name);
      }
    } else if (field.startsWith('game_publisher_id_')) {
      const pubIdField = field.replace('game_publisher_id_', '');
      const publisherId = gamePublisherIds.find((p) => p.id === pubIdField);
      if (publisherId) {
        headers.push(`Game ID: ${publisherId.label}`);
      }
    }
  });

  return headers;
};

const buildCSVRow = (
  selectedFields: string[],
  user: any,
  registration: any,
  team: any,
  tournamentFields: any[],
  userFieldValuesMap: Map<any, any>,
  gamePublisherIds: any[],
  userPubIdsMap: Map<any, any>
): any[] => {
  const row: any[] = [];

  selectedFields.forEach((field) => {
    if (field === 'player_id') {
      row.push(user.id || '');
    } else if (field === 'email') {
      row.push(user.email || '');
    } else if (field === 'username') {
      row.push(user.username || '');
    } else if (field === 'country') {
      row.push(user.country || '');
    } else if (field === 'registration_status') {
      row.push(registration.status || '');
    } else if (field === 'registration_date') {
      row.push(registration.created_at ? formatDateWithTime(registration.created_at) : '');
    } else if (field === 'discord_handle') {
      row.push(user.discord_handle || '');
    } else if (field === 'has_parental_consent') {
      row.push(user.has_parental_consent ? 'Yes' : 'No');
    } else if (field === 'date_of_birth') {
      row.push(user.date_of_birth || '');
    } else if (field === 'msisdn') {
      row.push(user.msisdn || '');
    } else if (field === 'bio') {
      row.push(user.bio || '');
    } else if (field === 'twitter_handle') {
      row.push(user.twitter_handle || '');
    } else if (field === 'steam_id') {
      row.push(user.steam_id || '');
    } else if (field === 'freefire_nickname') {
      row.push(user.freefire_nickname || '');
    } else if (field === 'ow2_battle_net_id') {
      row.push(user.ow2_battle_net_id || '');
    } else if (field === 'fc26_ea_id') {
      row.push(user.fc26_ea_id || '');
    } else if (field === 'apex_legends_ea_id') {
      row.push(user.apex_legends_ea_id || '');
    } else if (field === 'fortnite_epic_id') {
      row.push(user.fortnite_epic_id || '');
    } else if (field === 'rocket_league_epic_id') {
      row.push(user.rocket_league_epic_id || '');
    } else if (field === 'warzone_activision_id') {
      row.push(user.warzone_activision_id || '');
    } else if (field === 'r6_ubisoft_id') {
      row.push(user.r6_ubisoft_id || '');
    } else if (field === 'riot_game_name') {
      row.push(user.riot_game_name || '');
    } else if (field === 'riot_tagline') {
      row.push(user.riot_tagline || '');
    } else if (field === 'team_id') {
      row.push(team?.id || '');
    } else if (field === 'team_name') {
      row.push(team?.name || '');
    } else if (field === 'is_captain') {
      row.push(registration.is_captain ? 'Yes' : 'No');
    } else if (field.startsWith('tournament_field_')) {
      const fieldId = field.replace('tournament_field_', '');
      const fieldValueMap = userFieldValuesMap.get(user.id);
      const fieldValues = fieldValueMap ? fieldValueMap.get(fieldId) : [];

      if (fieldValues && fieldValues.length > 0) {
        const sortedValues = fieldValues.sort((a: any, b: any) => a.index - b.index);
        const formattedValues = sortedValues.map((fv: any) => formatFieldValueForDisplay(fv.value));
        row.push(formattedValues.join(' | '));
      } else {
        row.push('');
      }
    } else if (field.startsWith('game_publisher_id_')) {
      const pubIdField = field.replace('game_publisher_id_', '');
      const pubIdMap = userPubIdsMap.get(user.id);
      const pubIdValue = pubIdMap ? pubIdMap.get(pubIdField) : '';
      row.push(pubIdValue || '');
    }
  });

  return row;
};
