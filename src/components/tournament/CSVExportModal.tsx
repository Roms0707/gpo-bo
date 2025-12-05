import React, { useState, useEffect } from 'react';
import { Download, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface CSVExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentData: {
    id: string;
    title: string;
    type: 'solo' | 'team';
    game_id?: string | null;
  };
  playerCount: number;
  onExport: (selectedFields: string[]) => Promise<void>;
}

interface FieldSection {
  title: string;
  fields: { key: string; label: string; mandatory?: boolean }[];
  collapsed: boolean;
}

const CSVExportModal: React.FC<CSVExportModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentData,
  playerCount,
  onExport,
}) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [exportAll, setExportAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sections, setSections] = useState<FieldSection[]>([]);
  const [tournamentFields, setTournamentFields] = useState<any[]>([]);
  const [gamePublisherIds, setGamePublisherIds] = useState<any[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  const defaultFields = [
    'player_id',
    'email',
    'username',
    'country',
    'registration_status',
    'registration_date',
  ];

  useEffect(() => {
    if (isOpen) {
      loadFieldsAndPreferences();
    }
  }, [isOpen, tournamentId]);

  const loadFieldsAndPreferences = async () => {
    try {
      setIsLoadingFields(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingFields(false);
        return;
      }

      const [tourFieldsRes, pubIdsRes, prefsRes] = await Promise.all([
        supabase
          .from('tournament_fields')
          .select('id, name, field_type, tournament_id')
          .or(`tournament_id.eq.${tournamentId},tournament_id.is.null`)
          .order('name'),
        tournamentData.game_id
          ? supabase
              .from('game_publisher_ids')
              .select('id, label, id_name')
              .eq('game_id', tournamentData.game_id)
              .order('label')
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('user_export_preferences')
          .select('selected_fields')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (tourFieldsRes.error) throw tourFieldsRes.error;
      if (pubIdsRes.error) throw pubIdsRes.error;

      const tourFieldsData = tourFieldsRes.data || [];
      const pubIdsData = pubIdsRes.data || [];

      console.log(`[CSVExportModal] Loaded ${tourFieldsData.length} tournament fields for tournament ${tournamentId}`);
      if (tourFieldsData.length > 0) {
        console.log('[CSVExportModal] Tournament fields:', tourFieldsData);
      }

      setTournamentFields(tourFieldsData);
      setGamePublisherIds(pubIdsData);

      let initialFields: Set<string>;
      if (prefsRes.data?.selected_fields) {
        initialFields = new Set(prefsRes.data.selected_fields as string[]);
      } else {
        initialFields = new Set(defaultFields);
        if (tournamentData.type === 'team') {
          initialFields.add('team_name');
          initialFields.add('is_captain');
        }
        pubIdsData.forEach((pid: any) => {
          initialFields.add(`game_publisher_id_${pid.id}`);
        });
        // Auto-select all tournament custom fields by default
        tourFieldsData.forEach((field: any) => {
          initialFields.add(`tournament_field_${field.id}`);
        });
      }

      setSelectedFields(initialFields);
      buildSections(tourFieldsData, pubIdsData);
      setIsLoadingFields(false);
    } catch (error) {
      console.error('Error loading fields and preferences:', error);
      toast.error('Failed to load export preferences');
      setIsLoadingFields(false);
    }
  };

  const buildSections = (tourFields: any[], pubIds: any[]) => {
    const newSections: FieldSection[] = [
      {
        title: 'Basic User Information',
        collapsed: false,
        fields: [
          { key: 'player_id', label: 'Player ID', mandatory: true },
          { key: 'email', label: 'Email' },
          { key: 'username', label: 'Username' },
          { key: 'country', label: 'Country' },
          { key: 'registration_status', label: 'Registration Status' },
          { key: 'registration_date', label: 'Registration Date' },
        ],
      },
      {
        title: 'Profile Details',
        collapsed: true,
        fields: [
          { key: 'discord_handle', label: 'Discord Handle' },
          { key: 'has_parental_consent', label: 'Parental Consent' },
          { key: 'date_of_birth', label: 'Date of Birth' },
          { key: 'msisdn', label: 'Phone Number' },
          { key: 'bio', label: 'Bio' },
        ],
      },
      {
        title: 'Social & Gaming Handles',
        collapsed: true,
        fields: [
          { key: 'twitter_handle', label: 'Twitter Handle' },
          { key: 'steam_id', label: 'Steam ID' },
          { key: 'freefire_nickname', label: 'Free Fire Nickname' },
          { key: 'ow2_battle_net_id', label: 'Overwatch 2 Battle.net ID' },
          { key: 'fc26_ea_id', label: 'FC26 EA ID' },
          { key: 'apex_legends_ea_id', label: 'Apex Legends EA ID' },
          { key: 'fortnite_epic_id', label: 'Fortnite Epic ID' },
          { key: 'rocket_league_epic_id', label: 'Rocket League Epic ID' },
          { key: 'warzone_activision_id', label: 'Warzone Activision ID' },
          { key: 'r6_ubisoft_id', label: 'Rainbow Six Ubisoft ID' },
          { key: 'riot_game_name', label: 'Riot Game Name' },
          { key: 'riot_tagline', label: 'Riot Tagline' },
        ],
      },
    ];

    if (pubIds.length > 0) {
      newSections.push({
        title: 'Game Publisher IDs',
        collapsed: false,
        fields: pubIds.map((pid) => ({
          key: `game_publisher_id_${pid.id}`,
          label: `${pid.label}`,
        })),
      });
    }

    if (tourFields.length > 0) {
      newSections.push({
        title: `Tournament Custom Fields (${tourFields.length})`,
        collapsed: false,
        fields: tourFields.map((field) => ({
          key: `tournament_field_${field.id}`,
          label: field.name,
        })),
      });
    }

    if (tournamentData.type === 'team') {
      newSections.push({
        title: 'Team Information',
        collapsed: false,
        fields: [
          { key: 'team_id', label: 'Team ID' },
          { key: 'team_name', label: 'Team Name' },
          { key: 'is_captain', label: 'Is Captain' },
        ],
      });
    }

    setSections(newSections);
  };

  const handleExportAllToggle = async () => {
    if (!exportAll) {
      const allFields = new Set<string>();
      sections.forEach((section) => {
        section.fields.forEach((field) => {
          allFields.add(field.key);
        });
      });
      setSelectedFields(allFields);
      setExportAll(true);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_export_preferences')
          .select('selected_fields')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.selected_fields) {
          setSelectedFields(new Set(data.selected_fields as string[]));
        } else {
          setSelectedFields(new Set(defaultFields));
        }
      }
      setExportAll(false);
    }
  };

  const handleFieldToggle = (fieldKey: string, mandatory: boolean = false) => {
    if (mandatory) return;

    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldKey)) {
      newSelected.delete(fieldKey);
    } else {
      newSelected.add(fieldKey);
    }
    setSelectedFields(newSelected);
    setExportAll(false);
  };

  const handleSectionToggle = (sectionIndex: number) => {
    setSections((prev) =>
      prev.map((section, idx) =>
        idx === sectionIndex ? { ...section, collapsed: !section.collapsed } : section
      )
    );
  };

  const handleSectionSelectAll = (sectionIndex: number, select: boolean) => {
    const section = sections[sectionIndex];
    const newSelected = new Set(selectedFields);

    section.fields.forEach((field) => {
      if (select) {
        newSelected.add(field.key);
      } else if (!field.mandatory) {
        newSelected.delete(field.key);
      }
    });

    setSelectedFields(newSelected);
    setExportAll(false);
  };

  const handleExport = async () => {
    if (selectedFields.size === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    try {
      setIsExporting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fieldsArray = Array.from(selectedFields);
        await supabase.from('user_export_preferences').upsert(
          {
            user_id: user.id,
            selected_fields: fieldsArray,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );
      }

      await onExport(Array.from(selectedFields));
      onClose();
    } catch (error) {
      console.error('Error during export:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = selectedFields.size;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Player Data to CSV"
      size="2xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedCount} field{selectedCount !== 1 ? 's' : ''} selected • {playerCount} player
            {playerCount !== 1 ? 's' : ''} to export
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={selectedCount === 0 || isExporting}
              leftIcon={isExporting ? undefined : <Download size={16} />}
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      }
    >
      {isLoadingFields ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <Checkbox
                id="export-all"
                label="Export All Fields"
                description="Select all available fields for quick export"
                checked={exportAll}
                onChange={handleExportAllToggle}
              />
            </CardContent>
          </Card>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {sections.map((section, sectionIndex) => (
              <Card key={section.title}>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
                  onClick={() => handleSectionToggle(sectionIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {section.title}
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          ({section.fields.length} field{section.fields.length !== 1 ? 's' : ''})
                        </span>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {!section.collapsed && (
                        <div className="flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSectionSelectAll(sectionIndex, true)}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSectionSelectAll(sectionIndex, false)}
                          >
                            Deselect All
                          </Button>
                        </div>
                      )}
                      {section.collapsed ? (
                        <ChevronDown size={20} className="text-gray-500" />
                      ) : (
                        <ChevronUp size={20} className="text-gray-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                {!section.collapsed && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {section.fields.map((field) => (
                        <div
                          key={field.key}
                          className={`${field.mandatory ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Checkbox
                            id={field.key}
                            label={field.label}
                            checked={selectedFields.has(field.key)}
                            onChange={() => handleFieldToggle(field.key, field.mandatory)}
                            disabled={field.mandatory}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CSVExportModal;
