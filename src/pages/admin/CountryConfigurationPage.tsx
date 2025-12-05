import React, { useEffect, useState } from 'react';
import { Globe, Plus, Edit, Trash2, Zap, Copy, Clock, Power, PowerOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import AddCountryModal from '../../components/country/AddCountryModal';

interface CountryConfig {
  id: string;
  country_code: string;
  country_name: string;
  service_name: string;
  is_active: boolean;
  brand_name: string;
  logo_path: string;
  favicon_path: string;
  logo_alt_text: string;
  theme_colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    error: string;
    warning: string;
    [key: string]: string;
  };
  locale_language: string;
  locale_currency: string;
  locale_text_direction: string;
  galaxy_campaign_id: string | null;
  galaxy_service_id: string | null;
  galaxy_country_code: string | null;
  galaxy_language_code: string | null;
  is_default: boolean;
  extra_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const CountryConfigurationPage: React.FC = () => {
  const { user } = useAuthStore();
  const [configs, setConfigs] = useState<CountryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<CountryConfig | null>(null);

  // Master admin guard
  if (user?.role !== 'master_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Globe className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">
          Only Master Administrators can access the Country Configuration page.
        </p>
      </div>
    );
  }

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('country_configurations')
        .select('*')
        .order('country_name');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast.error('Failed to load country configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (countryId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('country_configurations')
        .update({ is_active: !currentStatus })
        .eq('id', countryId);

      if (error) throw error;

      toast.success(`Country ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchConfigurations();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleOpenAddModal = () => {
    setDuplicateData(null);
    setIsAddModalOpen(true);
  };

  const handleOpenDuplicateModal = (config: CountryConfig) => {
    setDuplicateData(config);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setDuplicateData(null);
  };

  const handleModalSuccess = () => {
    fetchConfigurations();
  };

  const getGalaxyStatus = (config: CountryConfig) => {
    if (!config.galaxy_campaign_id || !config.galaxy_service_id) {
      return { status: 'not_configured', label: 'Not Configured', variant: 'secondary' as const };
    }
    return { status: 'configured', label: 'Configured', variant: 'success' as const };
  };

  const getThemePreview = (colors: CountryConfig['theme_colors']) => {
    return (
      <div className="flex gap-1">
        <div
          className="w-4 h-4 rounded-full border border-gray-600"
          style={{ backgroundColor: colors.primary }}
          title={`Primary: ${colors.primary}`}
        />
        <div
          className="w-4 h-4 rounded-full border border-gray-600"
          style={{ backgroundColor: colors.secondary }}
          title={`Secondary: ${colors.secondary}`}
        />
        <div
          className="w-4 h-4 rounded-full border border-gray-600"
          style={{ backgroundColor: colors.accent}}
          title={`Accent: ${colors.accent}`}
        />
      </div>
    );
  };

  const filteredConfigs = configs.filter((config) => {
    const matchesSearch =
      config.country_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.country_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && config.is_active) ||
      (statusFilter === 'inactive' && !config.is_active);

    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary-500" />
            Country Configurations
          </h1>
          <p className="text-gray-400">
            Manage country-specific branding, themes, and integrations
          </p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={handleOpenAddModal}>
          Add New Country
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Configurations</CardTitle>
          <div className="flex gap-4 mt-4">
            <input
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-dark-300 border border-dark-200 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-dark-300 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredConfigs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No country configurations found</p>
              {searchQuery && (
                <p className="text-sm mt-2">
                  Try adjusting your search or filters
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead>Locale</TableHead>
                  <TableHead>Galaxy API</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => {
                  const galaxyStatus = getGalaxyStatus(config);
                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="font-medium text-white">
                          {config.country_name}
                          {config.is_default && (
                            <span className="ml-2 text-xs bg-warning-500 text-dark-400 px-2 py-0.5 rounded">DEFAULT</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {config.country_code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">{config.service_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">{config.brand_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {config.logo_path ? (
                            <img
                              src={config.logo_path}
                              alt={config.logo_alt_text}
                              className="h-8 w-auto object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 bg-dark-200 rounded flex items-center justify-center">
                              <Globe className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getThemePreview(config.theme_colors)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-white">{config.locale_language}</div>
                          <div className="text-gray-400">{config.locale_currency}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={galaxyStatus.variant}>
                          {galaxyStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleActive(config.id, config.is_active)}
                          className="group"
                          title={config.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {config.is_active ? (
                            <Power className="h-5 w-5 text-success-500 group-hover:text-success-400" />
                          ) : (
                            <PowerOff className="h-5 w-5 text-gray-500 group-hover:text-gray-400" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit Configuration"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Test Galaxy API"
                          >
                            <Zap size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Duplicate Configuration"
                            onClick={() => handleOpenDuplicateModal(config)}
                          >
                            <Copy size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="View History"
                          >
                            <Clock size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-error-500 hover:text-error-600"
                            title="Delete Configuration"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddCountryModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        duplicateData={duplicateData}
      />
    </div>
  );
};

export default CountryConfigurationPage;
