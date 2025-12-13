import React, { useEffect, useState } from 'react';
import { Settings, Plus, Edit, Trash2, Power, PowerOff, Copy, Search, Grid3x3, CheckCircle, AlertTriangle, Mail, MessageCircle, Phone, Files } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import AddProjectConfigModal from '../../components/projectConfig/AddProjectConfigModal';
import EditProjectConfigModal from '../../components/projectConfig/EditProjectConfigModal';
import DomainTestTool from '../../components/projectConfig/DomainTestTool';
import RubricMappingModal from '../../components/galaxyRubric/RubricMappingModal';
import { getMappingCountByProject } from '../../services/galaxyRubricMappingService';
import {
  fetchProjectConfigurations,
  deleteProjectConfiguration,
  toggleProjectConfigurationActive,
  duplicateProjectConfiguration,
  ProjectConfiguration,
  AuthMethod,
} from '../../services/projectConfigService';
import Input from '../../components/ui/Input';

const AUTH_METHOD_CONFIG: Record<AuthMethod, { label: string; icon: React.ReactNode; badgeVariant: 'default' | 'primary' | 'success' }> = {
  email: { label: 'Email', icon: <Mail className="w-3 h-3" />, badgeVariant: 'default' },
  discord: { label: 'Discord', icon: <MessageCircle className="w-3 h-3" />, badgeVariant: 'primary' },
  kliento: { label: 'Kliento', icon: <Phone className="w-3 h-3" />, badgeVariant: 'success' },
};

const ProjectConfigurationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [configs, setConfigs] = useState<ProjectConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [domainFilter, setDomainFilter] = useState<'all' | 'with-domain' | 'default' | 'no-domain'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ProjectConfiguration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mappingCounts, setMappingCounts] = useState<Record<string, number>>({});
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [newConfigId, setNewConfigId] = useState('');

  if (user?.role !== 'master_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Settings className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400">
          Only Master Administrators can access the Project Configurations page.
        </p>
      </div>
    );
  }

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    if (configs.length > 0) {
      loadMappingCounts();
    }
  }, [configs]);

  const loadConfigurations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await fetchProjectConfigurations();

      if (error) throw error;

      setConfigs(data || []);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast.error('Failed to load project configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappingCounts = async () => {
    try {
      const counts: Record<string, number> = {};
      await Promise.all(
        configs.map(async (config) => {
          const { count } = await getMappingCountByProject(config.id);
          counts[config.id] = count;
        })
      );
      setMappingCounts(counts);
    } catch (error) {
      console.error('Error loading mapping counts:', error);
    }
  };

  const handleToggleActive = async (config: ProjectConfiguration) => {
    try {
      const { error } = await toggleProjectConfigurationActive(config.id, !config.is_active);

      if (error) throw error;

      toast.success(`Configuration ${!config.is_active ? 'activated' : 'deactivated'} successfully`);
      loadConfigurations();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!selectedConfig) return;

    try {
      setIsDeleting(true);
      const { error } = await deleteProjectConfiguration(selectedConfig.id);

      if (error) throw error;

      toast.success('Configuration deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedConfig(null);
      loadConfigurations();
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Failed to delete configuration');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedConfig || !newConfigId.trim()) return;

    try {
      setIsDuplicating(true);
      const { error } = await duplicateProjectConfiguration(selectedConfig, newConfigId.trim());

      if (error) throw error;

      toast.success('Configuration duplicated successfully');
      setIsDuplicateModalOpen(false);
      setSelectedConfig(null);
      setNewConfigId('');
      loadConfigurations();
    } catch (error) {
      console.error('Error duplicating configuration:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate configuration');
    } finally {
      setIsDuplicating(false);
    }
  };

  const openDuplicateModal = (config: ProjectConfiguration) => {
    setSelectedConfig(config);
    setNewConfigId(`${config.config_id}-copy`);
    setIsDuplicateModalOpen(true);
  };

  const getColorPreview = (primaryColor: string, secondaryColor: string) => {
    return (
      <div className="flex gap-1">
        <div
          className="w-6 h-6 rounded border border-gray-600"
          style={{ backgroundColor: primaryColor }}
          title={`Primary: ${primaryColor}`}
        />
        <div
          className="w-6 h-6 rounded border border-gray-600"
          style={{ backgroundColor: secondaryColor }}
          title={`Secondary: ${secondaryColor}`}
        />
      </div>
    );
  };

  const getAuthMethodBadge = (config: ProjectConfiguration) => {
    const authMethod = config.auth_method || 'email';
    const authConfig = AUTH_METHOD_CONFIG[authMethod];
    return (
      <Badge variant={authConfig.badgeVariant} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5">
        {authConfig.icon}
        <span>{authConfig.label}</span>
      </Badge>
    );
  };

  const isLegalInfoComplete = (config: ProjectConfiguration): boolean => {
    return !!(
      config.support_email &&
      config.legal_email &&
      config.privacy_email &&
      config.company_name &&
      config.company_address &&
      config.phone_number &&
      config.registration_number
    );
  };

  const filteredConfigs = configs.filter((config) => {
    const matchesSearch =
      config.config_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.config_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (config.domain && config.domain.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && config.is_active) ||
      (statusFilter === 'inactive' && !config.is_active);

    const matchesDomain =
      domainFilter === 'all' ||
      (domainFilter === 'with-domain' && config.domain) ||
      (domainFilter === 'default' && config.is_default) ||
      (domainFilter === 'no-domain' && !config.domain && !config.is_default);

    return matchesSearch && matchesStatus && matchesDomain;
  });

  const activeCount = configs.filter(c => c.is_active).length;
  const inactiveCount = configs.filter(c => !c.is_active).length;
  const withDomainCount = configs.filter(c => c.domain).length;
  const defaultConfig = configs.find(c => c.is_default);
  const noDomainCount = configs.filter(c => !c.domain && !c.is_default).length;
  const completeLegalInfoCount = configs.filter(c => isLegalInfoComplete(c)).length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden px-2 md:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Settings className="h-6 w-6 md:h-7 md:w-7 text-primary-500 flex-shrink-0" />
            <span className="truncate">Project Configurations</span>
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Manage project-specific branding, themes, and integrations
          </p>
        </div>
        <Button
          leftIcon={<Plus size={18} />}
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto flex-shrink-0"
        >
          <span className="hidden sm:inline">Add Configuration</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <DomainTestTool />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        <Card className="overflow-hidden">
          <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-2 md:px-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-white">{configs.length}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1 truncate">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-2 md:px-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-success-500">{activeCount}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1 truncate">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-2 md:px-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-primary-500">{withDomainCount}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1 truncate">Domain</div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-2 md:px-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-yellow-500">{defaultConfig ? '1' : '0'}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1 truncate">Default</div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-2 md:px-4">
            <div className="text-center">
              <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${noDomainCount > 0 ? 'text-warning-500' : 'text-gray-500'}`}>{noDomainCount}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1 truncate">No Domain</div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-2 md:px-4">
            <div className="text-center">
              <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${completeLegalInfoCount === configs.length ? 'text-success-500' : completeLegalInfoCount > 0 ? 'text-warning-500' : 'text-error-500'}`}>
                {completeLegalInfoCount}/{configs.length}
              </div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1 truncate">Legal</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>All Configurations</CardTitle>
          <div className="flex flex-col gap-2 md:gap-3 mt-3 md:mt-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search configs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-dark-300 border border-dark-200 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 min-w-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 min-w-0 px-3 py-2 bg-dark-300 border border-dark-200 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value as any)}
                className="flex-1 min-w-0 px-3 py-2 bg-dark-300 border border-dark-200 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Domains</option>
                <option value="with-domain">Domain</option>
                <option value="default">Default</option>
                <option value="no-domain">None</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredConfigs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No configurations found</p>
              {searchQuery && (
                <p className="text-sm mt-2">
                  Try adjusting your search or filters
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="lg:hidden space-y-2 md:space-y-3">
              {filteredConfigs.map((config) => (
                <div
                  key={config.id}
                  className="bg-dark-300 border border-dark-200 rounded-lg p-3 space-y-2 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-sm truncate">
                          {config.config_name}
                        </h3>
                        {config.is_active ? (
                          <Power className="h-3.5 w-3.5 text-success-500 flex-shrink-0" />
                        ) : (
                          <PowerOff className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-gray-400 truncate">
                        {config.config_id}
                      </div>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedConfig(config);
                          setIsRubricModalOpen(true);
                        }}
                        className="p-1.5"
                      >
                        <Grid3x3 size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDuplicateModal(config)}
                        className="p-1.5"
                      >
                        <Files size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedConfig(config);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedConfig(config);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-error-500 p-1.5"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs min-w-0">
                    <div className="min-w-0">
                      <span className="text-gray-400 text-[10px]">Brand:</span>
                      <p className="text-white truncate">{config.brand_name}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-gray-400 text-[10px]">Domain:</span>
                      {config.domain ? (
                        <p className="text-white font-mono truncate text-[10px]">{config.domain}</p>
                      ) : config.is_default ? (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0.5">Default</Badge>
                      ) : (
                        <p className="text-gray-500">-</p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-gray-400 text-[10px]">Auth:</span>
                      <div className="mt-0.5">
                        {getAuthMethodBadge(config)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-gray-400 text-[10px]">Legal:</span>
                      <div className="flex items-center gap-1">
                        {isLegalInfoComplete(config) ? (
                          <CheckCircle className="h-3 w-3 text-success-500" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-warning-500" />
                        )}
                      </div>
                    </div>
                    {config.campaign_id && (
                      <div className="min-w-0">
                        <span className="text-gray-400 text-[10px]">Rubrics:</span>
                        <p className="text-white">
                          {mappingCounts[config.id] !== undefined ? (
                            <Badge variant={mappingCounts[config.id] > 0 ? 'success' : 'default'} className="text-[10px] px-1.5 py-0.5">
                              {mappingCounts[config.id]}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-dark-200 min-w-0">
                    {config.logo_path && (
                      <img
                        src={config.logo_path}
                        alt={config.logo_alt_text}
                        className="h-5 w-auto object-contain max-w-[60px]"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    {getColorPreview(config.primary_color, config.secondary_color)}
                    <button
                      onClick={() => handleToggleActive(config)}
                      className="ml-auto px-2 py-1 rounded text-[10px] font-medium transition-colors flex-shrink-0"
                      style={{
                        backgroundColor: config.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: config.is_active ? 'rgb(34, 197, 94)' : 'rgb(107, 114, 128)',
                      }}
                    >
                      {config.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block -mx-6 overflow-x-auto">
              <div className="px-6 min-w-max">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Config ID</TableHead>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Domain</TableHead>
                    <TableHead className="whitespace-nowrap">Auth</TableHead>
                    <TableHead className="whitespace-nowrap">Brand</TableHead>
                    <TableHead className="hidden xl:table-cell whitespace-nowrap">Logo</TableHead>
                    <TableHead className="hidden xl:table-cell whitespace-nowrap">Colors</TableHead>
                    <TableHead className="hidden 2xl:table-cell whitespace-nowrap">Product ID</TableHead>
                    <TableHead className="hidden 2xl:table-cell whitespace-nowrap">Campaign ID</TableHead>
                    <TableHead className="hidden xl:table-cell whitespace-nowrap">Rubrics</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="hidden xl:table-cell whitespace-nowrap">Legal Info</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-mono text-xs text-white truncate max-w-[100px]">
                          {config.config_id}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-white text-sm truncate max-w-[140px]">{config.config_name}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {config.domain ? (
                          <div className="text-sm text-white font-mono truncate max-w-[160px]">{config.domain}</div>
                        ) : config.is_default ? (
                          <Badge variant="success">Default</Badge>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getAuthMethodBadge(config)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-white text-sm truncate max-w-[120px]">{config.brand_name}</div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {config.logo_path ? (
                            <img
                              src={config.logo_path}
                              alt={config.logo_alt_text}
                              className="h-8 w-auto object-contain max-w-[80px]"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 bg-dark-200 rounded flex items-center justify-center">
                              <Settings className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell whitespace-nowrap">
                        {getColorPreview(config.primary_color, config.secondary_color)}
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell whitespace-nowrap">
                        <div className="text-xs text-gray-400 truncate max-w-[80px]">
                          {config.product_id || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell whitespace-nowrap">
                        <div className="text-xs text-gray-400 truncate max-w-[80px]">
                          {config.campaign_id || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {mappingCounts[config.id] !== undefined ? (
                            <Badge variant={mappingCounts[config.id] > 0 ? 'success' : 'default'}>
                              {mappingCounts[config.id]}
                            </Badge>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(config)}
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
                      <TableCell className="hidden xl:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isLegalInfoComplete(config) ? (
                            <div className="flex items-center gap-1" title="All legal information complete">
                              <CheckCircle className="h-4 w-4 text-success-500" />
                              <span className="text-xs text-success-500 whitespace-nowrap">Complete</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1" title="Legal information incomplete">
                              <AlertTriangle className="h-4 w-4 text-warning-500" />
                              <span className="text-xs text-warning-500 whitespace-nowrap">Incomplete</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Manage Rubric Mappings"
                            onClick={() => {
                              setSelectedConfig(config);
                              setIsRubricModalOpen(true);
                            }}
                            className="p-1.5"
                          >
                            <Grid3x3 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Duplicate Configuration"
                            onClick={() => openDuplicateModal(config)}
                            className="p-1.5"
                          >
                            <Files size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit Configuration"
                            onClick={() => {
                              setSelectedConfig(config);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete Configuration"
                            onClick={() => {
                              setSelectedConfig(config);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-error-500 hover:text-error-600 p-1.5"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <AddProjectConfigModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadConfigurations}
      />

      <EditProjectConfigModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedConfig(null);
        }}
        onSuccess={loadConfigurations}
        config={selectedConfig}
      />

      {selectedConfig && (
        <RubricMappingModal
          isOpen={isRubricModalOpen}
          onClose={() => {
            setIsRubricModalOpen(false);
            setSelectedConfig(null);
            loadMappingCounts();
          }}
          projectConfig={selectedConfig}
        />
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedConfig(null);
        }}
        title="Delete Configuration"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedConfig(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              leftIcon={<Trash2 size={16} />}
            >
              Delete Configuration
            </Button>
          </div>
        }
      >
        {selectedConfig && (
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete this configuration? This action cannot be undone.
            </p>
            <div className="bg-dark-200 p-4 rounded-lg">
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-400">Config ID:</span>
                  <p className="font-mono text-white">{selectedConfig.config_id}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Name:</span>
                  <p className="text-white">{selectedConfig.config_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Brand:</span>
                  <p className="text-white">{selectedConfig.brand_name}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setSelectedConfig(null);
          setNewConfigId('');
        }}
        title="Duplicate Configuration"
        footer={
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDuplicateModalOpen(false);
                setSelectedConfig(null);
                setNewConfigId('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              isLoading={isDuplicating}
              leftIcon={<Files size={16} />}
              disabled={!newConfigId.trim()}
              className="w-full sm:w-auto"
            >
              Duplicate
            </Button>
          </div>
        }
      >
        {selectedConfig && (
          <div className="space-y-4">
            <p className="text-gray-300">
              Create a copy of this configuration with a new Config ID.
            </p>
            <div className="bg-dark-200 p-3 md:p-4 rounded-lg">
              <div className="space-y-2">
                <div>
                  <span className="text-xs md:text-sm text-gray-400">Source Config:</span>
                  <p className="font-mono text-white text-sm truncate">{selectedConfig.config_id}</p>
                </div>
                <div>
                  <span className="text-xs md:text-sm text-gray-400">Name:</span>
                  <p className="text-white text-sm truncate">{selectedConfig.config_name}</p>
                </div>
              </div>
            </div>
            <Input
              label="New Config ID"
              value={newConfigId}
              onChange={(e) => setNewConfigId(e.target.value.toLowerCase())}
              placeholder="new-config-id"
              helperText="Lowercase alphanumeric with hyphens (3-50 chars)"
              required
            />
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
              <p className="text-xs md:text-sm text-primary-300">
                The duplicate will be created as inactive with no domain assigned. You can edit it after creation.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectConfigurationsPage;
