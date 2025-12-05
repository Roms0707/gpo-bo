import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Calendar, Eye, Share2, Trash2, Copy, Check, Clock, AlertCircle, ExternalLink, Trophy, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import { formatDateWithTime } from '../utils/dateUtils';
import { parseFieldValue } from '../utils/fieldValueUtils';
import { Database } from '../types/supabase';

type TournamentReport = Database['public']['Tables']['tournament_reports']['Row'] & {
  tournament?: {
    id: string;
    title: string;
  } | null;
  share?: Database['public']['Tables']['report_shares']['Row'] | null;
};

const ReportsPage: React.FC = () => {
  const { user, canGenerateReports } = useAuthStore();
  const [reports, setReports] = useState<TournamentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<TournamentReport | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [expirationDays, setExpirationDays] = useState<number>(30);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<TournamentReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: reportsData, error: reportsError } = await supabase
        .from('tournament_reports')
        .select(`
          *,
          tournament:tournament_id(id, title)
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      const reportIds = reportsData?.map(r => r.id) || [];

      let sharesData: Database['public']['Tables']['report_shares']['Row'][] = [];
      if (reportIds.length > 0) {
        const { data: shares, error: sharesError } = await supabase
          .from('report_shares')
          .select('*')
          .in('report_id', reportIds);

        if (sharesError) throw sharesError;
        sharesData = shares || [];
      }

      const reportsWithShares = reportsData?.map(report => ({
        ...report,
        share: sharesData.find(s => s.report_id === report.id) || null
      })) || [];

      setReports(reportsWithShares);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
      setIsLoading(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!selectedReport || !user) return;

    if (!canGenerateReports()) {
      toast.error('You do not have permission to generate share links. Only super_admin and master_admin can create share links.');
      return;
    }

    try {
      setIsGeneratingShare(true);

      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');

      if (tokenError) {
        const shareToken = Math.random().toString(36).substring(2, 15) +
                          Math.random().toString(36).substring(2, 15);

        const expiresAt = expirationDays > 0
          ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data: shareData, error: shareError } = await supabase
          .from('report_shares')
          .insert({
            report_id: selectedReport.id,
            share_token: shareToken,
            expires_at: expiresAt,
            created_by: user.id
          })
          .select()
          .single();

        if (shareError) throw shareError;

        toast.success('Share link generated successfully');
        setIsShareModalOpen(false);
        fetchReports();
        return;
      }

      const shareToken = tokenData as string;
      const expiresAt = expirationDays > 0
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data: shareData, error: shareError } = await supabase
        .from('report_shares')
        .insert({
          report_id: selectedReport.id,
          share_token: shareToken,
          expires_at: expiresAt,
          created_by: user.id
        })
        .select()
        .single();

      if (shareError) throw shareError;

      toast.success('Share link generated successfully');
      setIsShareModalOpen(false);
      fetchReports();
    } catch (err) {
      console.error('Error generating share link:', err);
      toast.error('Failed to generate share link');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleCopyShareLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/report/${token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToken(token);
      toast.success('Share link copied to clipboard');
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  };

  const handleDeactivateShare = async (shareId: string) => {
    if (!canGenerateReports()) {
      toast.error('You do not have permission to manage share links.');
      return;
    }

    try {
      const { error } = await supabase
        .from('report_shares')
        .update({ is_active: false })
        .eq('id', shareId);

      if (error) throw error;

      toast.success('Share link deactivated');
      fetchReports();
    } catch (err) {
      console.error('Error deactivating share:', err);
      toast.error('Failed to deactivate share link');
    }
  };

  const handleDeleteClick = (report: TournamentReport) => {
    if (!canGenerateReports()) {
      toast.error('You do not have permission to delete reports. Only super_admin and master_admin can delete reports.');
      return;
    }

    setReportToDelete(report);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('tournament_reports')
        .delete()
        .eq('id', reportToDelete.id);

      if (error) throw error;

      toast.success('Report deleted successfully');
      setIsDeleteModalOpen(false);
      setReportToDelete(null);
      fetchReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Failed to delete report');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportAllPlayers = async (report: TournamentReport) => {
    if (!report.tournament_id) {
      toast.error('This report is not associated with a specific tournament');
      return;
    }

    if (!canGenerateReports()) {
      toast.error('You do not have permission to export registration data.');
      return;
    }

    let loadingToast: string | undefined;
    try {
      loadingToast = toast.loading('Generating CSV export...');

      // Fetch tournament details
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id, title, type, game_id')
        .eq('id', report.tournament_id)
        .single();

      if (tournamentError) {
        console.error('Error fetching tournament:', tournamentError);
        throw new Error(`Failed to fetch tournament: ${tournamentError.message}`);
      }
      if (!tournament) {
        toast.dismiss(loadingToast);
        toast.error('Tournament not found');
        return;
      }

      // Fetch all registrations for this tournament
      const { data: registrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          status,
          created_at,
          user_id,
          team_id
        `)
        .eq('tournament_id', report.tournament_id)
        .order('created_at', { ascending: false });

      if (regError) {
        console.error('Error fetching registrations:', regError);
        throw new Error(`Failed to fetch registrations: ${regError.message}`);
      }

      if (!registrations || registrations.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('No registrations found for this tournament');
        return;
      }

      const userIds = registrations.map(reg => reg.user_id);

      // Fetch user data
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, has_parental_consent, country, username, discord_handle')
        .in('id', userIds);

      if (userError) {
        console.error('Error fetching users:', userError);
        throw new Error(`Failed to fetch user data: ${userError.message}`);
      }

      if (!users || users.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('No user data found for registered players');
        return;
      }

      const userMap = new Map();
      users.forEach(user => {
        userMap.set(user.id, user);
      });

      // Fetch tournament custom fields
      const { data: tournamentFields, error: fieldsError } = await supabase
        .from('tournament_fields')
        .select('id, name, field_type')
        .eq('tournament_id', report.tournament_id)
        .order('name');

      if (fieldsError) {
        console.error('Error fetching tournament fields:', fieldsError);
        throw new Error(`Failed to fetch tournament fields: ${fieldsError.message}`);
      }

      // Fetch user tournament field values
      const { data: userFieldValues, error: fieldValuesError } = await supabase
        .from('user_tournament_field_values')
        .select('user_id, field_id, field_index, value')
        .eq('tournament_id', report.tournament_id)
        .in('user_id', userIds);

      if (fieldValuesError) {
        console.error('Error fetching user field values:', fieldValuesError);
        throw new Error(`Failed to fetch user field values: ${fieldValuesError.message}`);
      }

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

      const userPubIdsMap = new Map();
      userGamePublisherValues.forEach(upv => {
        if (!userPubIdsMap.has(upv.user_id)) {
          userPubIdsMap.set(upv.user_id, new Map());
        }
        userPubIdsMap.get(upv.user_id).set(upv.game_publisher_id, upv.value);
      });

      // Fetch team data if team tournament
      let teamMap = new Map();
      let captainMap = new Map();

      if (tournament.type === 'team') {
        const teamIds = registrations
          .filter(reg => reg.team_id)
          .map(reg => reg.team_id);

        if (teamIds.length > 0) {
          const { data: teams, error: teamError } = await supabase
            .from('teams')
            .select('id, name')
            .in('id', teamIds);

          if (teamError) {
            console.error('Error fetching teams:', teamError);
            throw new Error(`Failed to fetch teams: ${teamError.message}`);
          }
          (teams || []).forEach(team => {
            teamMap.set(team.id, team);
          });

          // Fetch team members to identify captains
          const { data: teamMembers, error: teamMembersError } = await supabase
            .from('team_members')
            .select('team_id, user_id, role')
            .in('team_id', teamIds);

          if (teamMembersError) {
            console.error('Error fetching team members:', teamMembersError);
            throw new Error(`Failed to fetch team members: ${teamMembersError.message}`);
          }
          (teamMembers || []).forEach(member => {
            if (member.role === 'captain') {
              captainMap.set(`${member.team_id}_${member.user_id}`, true);
            }
          });
        }
      }

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
      if (tournament.type === 'team') {
        headers.push('Team ID', 'Team Name', 'Is Captain');
      }

      // Add game publisher ID columns
      gamePublisherIds.forEach(pid => {
        headers.push(`Game ID: ${pid.label}`);
      });

      // Build CSV rows with semicolon delimiter for better Excel compatibility
      const csvContent = [
        headers.join(';'),
        ...registrations.map(reg => {
          try {
            const user = userMap.get(reg.user_id);
            if (!user) return '';

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
            if (tournament.type === 'team') {
              const team = reg.team_id ? teamMap.get(reg.team_id) : null;
              const isCaptain = reg.team_id ? captainMap.has(`${reg.team_id}_${reg.user_id}`) : false;
              row.push(
                team?.id || '',
                team?.name || '',
                isCaptain ? 'Yes' : 'No'
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

      // Download CSV
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
      toast.success(`${registrations.length} player${registrations.length > 1 ? 's' : ''} exported successfully`);
    } catch (err) {
      console.error('Error exporting players:', err);
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to export players';
      toast.error(errorMessage);
    }
  };

  const isShareExpired = (share: Database['public']['Tables']['report_shares']['Row']) => {
    if (!share.expires_at) return false;
    return new Date(share.expires_at) < new Date();
  };

  const getShareStatus = (share: Database['public']['Tables']['report_shares']['Row'] | null) => {
    if (!share) {
      return <Badge variant="secondary">No Share</Badge>;
    }
    if (!share.is_active) {
      return <Badge variant="error">Deactivated</Badge>;
    }
    if (isShareExpired(share)) {
      return <Badge variant="warning">Expired</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournament Reports</h1>
          <p className="text-gray-400 mt-1">Generate tournament-specific or platform-wide reports to share with clients</p>
        </div>
        {canGenerateReports() ? (
          <Link to="/statistics?generate-report=true">
            <Button leftIcon={<Plus size={16} />}>
              Generate New Report
            </Button>
          </Link>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Report generation restricted to Super Admin and Master Admin
          </Badge>
        )}
      </div>

      {error && (
        <Card className="bg-error-900/20 border-error-500/30">
          <CardContent className="py-4">
            <div className="flex items-center text-error-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Reports Yet</h3>
            <p className="text-gray-400 mb-6">
              Generate reports for specific tournaments or platform-wide analytics to share with clients
            </p>
            {canGenerateReports() ? (
              <Link to="/statistics?generate-report=true">
                <Button leftIcon={<Plus size={16} />}>
                  Generate Your First Report
                </Button>
              </Link>
            ) : (
              <div className="bg-dark-200 border border-dark-300 rounded-lg p-4">
                <p className="text-gray-300 text-sm">
                  You do not have permission to generate reports. Please contact a Super Admin or Master Admin.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Title</TableHead>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Share Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-primary-400 mr-2" />
                        <span className="font-medium text-white">{report.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {report.tournament ? (
                        <div className="flex items-center">
                          <Trophy className="h-3 w-3 text-primary-400 mr-1.5 flex-shrink-0" />
                          <span className="text-gray-300">{report.tournament.title}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-gray-500 italic">All Tournaments</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-gray-400 text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDateWithTime(report.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getShareStatus(report.share)}
                    </TableCell>
                    <TableCell>
                      {report.share ? (
                        <div className="flex items-center text-gray-400">
                          <Eye className="h-4 w-4 mr-1" />
                          <span>{report.share.view_count}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {report.tournament_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Export all players CSV"
                            onClick={() => handleExportAllPlayers(report)}
                            className="text-primary-500 hover:text-primary-600"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {report.share && report.share.is_active && !isShareExpired(report.share) ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Copy share link"
                              onClick={() => handleCopyShareLink(report.share!.share_token)}
                            >
                              {copiedToken === report.share.share_token ? (
                                <Check className="h-4 w-4 text-success-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <a
                              href={`/report/${report.share.share_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                title="View report"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Deactivate share link"
                              onClick={() => handleDeactivateShare(report.share!.id)}
                              className="text-warning-500 hover:text-warning-600"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Generate share link"
                            onClick={() => {
                              setSelectedReport(report);
                              setIsShareModalOpen(true);
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete report"
                          onClick={() => handleDeleteClick(report)}
                          className="text-error-500 hover:text-error-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Generate Share Link"
      >
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 mb-4">
              Generate a shareable link for: <strong className="text-white">{selectedReport?.title}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Link Expiration
            </label>
            <Input
              type="number"
              value={expirationDays}
              onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
              placeholder="Days until expiration (0 = never)"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Set to 0 for a link that never expires
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsShareModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateShareLink}
              disabled={isGeneratingShare}
              leftIcon={<Share2 size={16} />}
            >
              {isGeneratingShare ? 'Generating...' : 'Generate Link'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setReportToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Report"
        message={`Are you sure you want to delete "${reportToDelete?.title}"? This action cannot be undone and will also delete any associated share links.`}
        confirmText="Delete Report"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ReportsPage;
