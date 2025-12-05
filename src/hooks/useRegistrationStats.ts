import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FilterState } from './useUrlFilters';

export interface RegistrationStats {
  totalRegistrations: number;
  approvedRegistrations: number;
  pendingRegistrations: number;
  rejectedRegistrations: number;
  backupRegistrations: number;
  conversionRate: number;
  avgFillRate: number;
  avgRegistrationSpeed: number;
  retentionRate: number;
  abandonmentRate: number;
  newVsReturning: { new: number; returning: number };
  peakRegistrationTime: { day: string; hour: number; count: number } | null;
  underperformingTournaments: number;
  avgApprovalTime: number;
}

export interface TournamentRegistrationDetail {
  tournamentId: string;
  tournamentTitle: string;
  gameName: string;
  totalRegistrations: number;
  maxPlayers: number;
  fillRate: number;
  registrationSpeed: number;
  status: string;
  type: string;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  backupCount: number;
}

export const useRegistrationStats = (filters: FilterState) => {
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<TournamentRegistrationDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let registrationsQuery = supabase
          .from('tournament_registrations')
          .select(`
            id,
            tournament_id,
            user_id,
            status,
            created_at,
            tournament:tournament_id (
              id,
              title,
              type,
              status,
              max_nb_players,
              game_id,
              registration_start_date,
              game:game_id (
                name
              )
            )
          `);

        if (filters.tournamentIds.length > 0) {
          registrationsQuery = registrationsQuery.in('tournament_id', filters.tournamentIds);
        }

        if (filters.startDate) {
          registrationsQuery = registrationsQuery.gte('created_at', filters.startDate);
        }

        if (filters.endDate) {
          registrationsQuery = registrationsQuery.lte('created_at', filters.endDate);
        }

        const { data: registrations, error: regError } = await registrationsQuery;

        if (regError) throw regError;

        if (!registrations) {
          setStats(null);
          setTournamentDetails([]);
          setIsLoading(false);
          return;
        }

        const filteredRegistrations = registrations.filter(reg => {
          if (!reg.tournament) return false;

          const tournament = reg.tournament as any;

          if (filters.status && tournament.status !== filters.status) return false;
          if (filters.type && tournament.type !== filters.type) return false;

          return true;
        });

        const totalRegistrations = filteredRegistrations.length;
        const approvedRegistrations = filteredRegistrations.filter(r => r.status === 'approved').length;
        const pendingRegistrations = filteredRegistrations.filter(r => r.status === 'pending').length;
        const rejectedRegistrations = filteredRegistrations.filter(r => r.status === 'rejected').length;
        const backupRegistrations = filteredRegistrations.filter(r => r.status === 'backup').length;

        const uniqueUserIds = new Set(filteredRegistrations.map(r => r.user_id));
        const userRegistrationCounts: Record<string, number> = {};
        filteredRegistrations.forEach(reg => {
          userRegistrationCounts[reg.user_id] = (userRegistrationCounts[reg.user_id] || 0) + 1;
        });

        const returningUsers = Object.values(userRegistrationCounts).filter(count => count > 1).length;
        const newUsers = uniqueUserIds.size - returningUsers;
        const retentionRate = uniqueUserIds.size > 0 ? (returningUsers / uniqueUserIds.size) * 100 : 0;

        const tournamentMap = new Map<string, any>();
        filteredRegistrations.forEach(reg => {
          if (!reg.tournament) return;
          const tournament = reg.tournament as any;

          if (!tournamentMap.has(tournament.id)) {
            tournamentMap.set(tournament.id, {
              ...tournament,
              registrations: [],
            });
          }
          tournamentMap.get(tournament.id).registrations.push(reg);
        });

        let totalFillRate = 0;
        let totalSpeed = 0;
        let underperforming = 0;
        const tournamentDetailsArray: TournamentRegistrationDetail[] = [];

        tournamentMap.forEach((tournament) => {
          const regs = tournament.registrations;
          const fillRate = tournament.max_nb_players
            ? (regs.filter((r: any) => r.status === 'approved').length / tournament.max_nb_players) * 100
            : 0;

          totalFillRate += fillRate;

          if (fillRate < 50 && tournament.status !== 'past') {
            underperforming++;
          }

          const regStartDate = tournament.registration_start_date
            ? new Date(tournament.registration_start_date).getTime()
            : new Date(regs[0]?.created_at).getTime();

          const firstRegDate = regs.length > 0
            ? new Date(regs[0].created_at).getTime()
            : Date.now();

          const speedInHours = (firstRegDate - regStartDate) / (1000 * 60 * 60);
          totalSpeed += Math.max(0, speedInHours);

          tournamentDetailsArray.push({
            tournamentId: tournament.id,
            tournamentTitle: tournament.title,
            gameName: tournament.game?.name || 'N/A',
            totalRegistrations: regs.length,
            maxPlayers: tournament.max_nb_players || 0,
            fillRate: Math.round(fillRate),
            registrationSpeed: Math.round(speedInHours * 10) / 10,
            status: tournament.status,
            type: tournament.type,
            approvedCount: regs.filter((r: any) => r.status === 'approved').length,
            pendingCount: regs.filter((r: any) => r.status === 'pending').length,
            rejectedCount: regs.filter((r: any) => r.status === 'rejected').length,
            backupCount: regs.filter((r: any) => r.status === 'backup').length,
          });
        });

        const avgFillRate = tournamentMap.size > 0 ? totalFillRate / tournamentMap.size : 0;
        const avgRegistrationSpeed = tournamentMap.size > 0 ? totalSpeed / tournamentMap.size : 0;

        const dayOfWeekCount: Record<number, number> = {};
        const hourCount: Record<number, number> = {};

        filteredRegistrations.forEach(reg => {
          const date = new Date(reg.created_at);
          const day = date.getDay();
          const hour = date.getHours();

          dayOfWeekCount[day] = (dayOfWeekCount[day] || 0) + 1;
          hourCount[hour] = (hourCount[hour] || 0) + 1;
        });

        const peakDay = Object.entries(dayOfWeekCount).sort(([, a], [, b]) => b - a)[0];
        const peakHour = Object.entries(hourCount).sort(([, a], [, b]) => b - a)[0];

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const peakRegistrationTime = peakDay && peakHour ? {
          day: dayNames[parseInt(peakDay[0])],
          hour: parseInt(peakHour[0]),
          count: peakDay[1]
        } : null;

        const conversionRate = totalRegistrations > 0
          ? (approvedRegistrations / totalRegistrations) * 100
          : 0;

        const abandonmentRate = totalRegistrations > 0
          ? (rejectedRegistrations / totalRegistrations) * 100
          : 0;

        setStats({
          totalRegistrations,
          approvedRegistrations,
          pendingRegistrations,
          rejectedRegistrations,
          backupRegistrations,
          conversionRate: Math.round(conversionRate * 10) / 10,
          avgFillRate: Math.round(avgFillRate * 10) / 10,
          avgRegistrationSpeed: Math.round(avgRegistrationSpeed * 10) / 10,
          retentionRate: Math.round(retentionRate * 10) / 10,
          abandonmentRate: Math.round(abandonmentRate * 10) / 10,
          newVsReturning: { new: newUsers, returning: returningUsers },
          peakRegistrationTime,
          underperformingTournaments: underperforming,
          avgApprovalTime: 0,
        });

        setTournamentDetails(tournamentDetailsArray.sort((a, b) => b.totalRegistrations - a.totalRegistrations));

      } catch (err) {
        console.error('Error fetching registration stats:', err);
        setError('Failed to load registration statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    const channel = supabase
      .channel('registration-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  return { stats, tournamentDetails, isLoading, error };
};
