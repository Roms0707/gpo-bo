import React, { useEffect, useState } from 'react';
import { Settings, Users, Shield, Plus, Edit, Trash2, Key, Database, Monitor, HardDrive, Cpu, MemoryStick, AlertTriangle, Check, X, User, Palette, ArrowRight, BrainCircuit } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { countries } from '../data/countries';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'master_admin' | 'super_admin' | null;
  country: string | null;
  created_at: string;
}

interface SystemInfo {
  totalUsers: number;
  totalTournaments: number;
  activeTournaments: number;
  totalRegistrations: number;
  databaseSize: string;
  uptime: string;
}

const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [isDeleteAdminModalOpen, setIsDeleteAdminModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // Form states
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin' | 'master_admin'>('admin');
  const [newAdminCountry, setNewAdminCountry] = useState('');
  const [editAdminRole, setEditAdminRole] = useState<'admin' | 'super_admin' | 'master_admin'>('admin');
  const [editAdminCountry, setEditAdminCountry] = useState('');

  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);

  // Pagination states
  const [displayedAdmins, setDisplayedAdmins] = useState<AdminUser[]>([]);
  const [showAllAdmins, setShowAllAdmins] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const INITIAL_DISPLAY_COUNT = 5;

  useEffect(() => {
    fetchAdminUsers();
    fetchSystemInfo();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, country, created_at')
        .eq('type', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort to put current user first, then others by creation date
      const sortedData = (data as AdminUser[]).sort((a, b) => {
        // Current user always comes first
        if (a.id === user?.id) return -1;
        if (b.id === user?.id) return 1;

        // For others, sort by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAdminUsers(sortedData);

      // Set initial display (first 5 users)
      setDisplayedAdmins(sortedData.slice(0, INITIAL_DISPLAY_COUNT));
      setShowAllAdmins(sortedData.length <= INITIAL_DISPLAY_COUNT);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      setError('Failed to load admin users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMore = async () => {
    setIsLoadingMore(true);

    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    setDisplayedAdmins(adminUsers);
    setShowAllAdmins(true);
    setIsLoadingMore(false);
  };

  const fetchSystemInfo = async () => {
    try {
      // Fetch basic system statistics
      const [usersCount, tournamentsCount, activeTournamentsCount, registrationsCount] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tournament_registrations').select('*', { count: 'exact', head: true })
      ]);

      setSystemInfo({
        totalUsers: usersCount.count || 0,
        totalTournaments: tournamentsCount.count || 0,
        activeTournaments: activeTournamentsCount.count || 0,
        totalRegistrations: registrationsCount.count || 0,
        databaseSize: 'N/A',
        uptime: 'N/A'
      });
    } catch (error) {
      console.error('Error fetching system info:', error);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newAdminRole === 'admin' && !newAdminCountry) {
      toast.error('Please select a country for admin role');
      return;
    }

    try {
      setIsCreatingAdmin(true);

      // Call the Edge Function to create the admin user
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newAdminEmail,
          password: newAdminPassword,
          role: newAdminRole,
          country: newAdminRole === 'admin' ? newAdminCountry : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create administrator');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create administrator');
      }

      toast.success('Administrator created successfully');
      setIsAddAdminModalOpen(false);
      resetAddAdminForm();
      fetchAdminUsers();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create administrator');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      setIsUpdatingAdmin(true);

      const { error } = await supabase
        .from('users')
        .update({
          role: editAdminRole,
          country: editAdminRole === 'admin' ? editAdminCountry : null
        })
        .eq('id', selectedAdmin.id);

      if (error) throw error;

      toast.success('Administrator updated successfully');
      setIsEditAdminModalOpen(false);
      setSelectedAdmin(null);
      fetchAdminUsers();
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Failed to update administrator');
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      setIsDeletingAdmin(true);

      // Call the Edge Function to delete the admin user
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-admin-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedAdmin.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete administrator');
      }

      toast.success('Administrator deleted successfully');
      setIsDeleteAdminModalOpen(false);
      setSelectedAdmin(null);
      fetchAdminUsers();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to delete administrator');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  const resetAddAdminForm = () => {
    setNewAdminEmail('');
    setNewAdminPassword('');
    setNewAdminRole('admin');
    setNewAdminCountry('');
  };

  const openEditModal = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditAdminRole(admin.role || 'admin');
    setEditAdminCountry(admin.country || '');
    setIsEditAdminModalOpen(true);
  };

  const openDeleteModal = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsDeleteAdminModalOpen(true);
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'master_admin':
        return <Badge variant="error" className="bg-red-600 text-white">Master Admin</Badge>;
      case 'super_admin':
        return <Badge variant="warning" className="bg-orange-600 text-white">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="primary">Admin</Badge>;
      default:
        return <Badge variant="secondary">No Role</Badge>;
    }
  };

  const getAccessLevelBadge = (admin: AdminUser) => {
    if (admin.role === 'master_admin') {
      return <Badge variant="success" className="bg-green-600 text-white">Full Access</Badge>;
    } else if (admin.role === 'super_admin') {
      return <Badge variant="warning" className="bg-orange-600 text-white">Enhanced Access</Badge>;
    } else if (admin.role === 'admin' && admin.country) {
      return <Badge variant="primary" className="bg-blue-600 text-white">Country Access</Badge>;
    } else if (admin.role === 'admin' && !admin.country) {
      return <Badge variant="error" className="bg-red-600 text-white">No Access</Badge>;
    } else {
      return <Badge variant="secondary">Limited Access</Badge>;
    }
  };

  const getCountryName = (countryCode: string | null) => {
    if (!countryCode) return 'Not assigned';
    const country = countries.find(c => c.value === countryCode);
    return country ? `${country.flag} ${country.label}` : countryCode;
  };

  const canManageRoles = user?.id && adminUsers.find(admin => admin.id === user.id)?.role === 'master_admin';
  const canManageCountries = user?.id && ['master_admin', 'super_admin'].includes(adminUsers.find(admin => admin.id === user.id)?.role || '');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Admin Configuration</h1>
        <p className="text-gray-400">Manage system settings and administrator accounts</p>
      </div>

      {/* Quick Links Section */}
      {canManageRoles && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary-500 transition-colors"
            onClick={() => navigate('/admin/project-configurations')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-accent-500/10 rounded-lg">
                    <Palette className="h-6 w-6 text-accent-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Project Configurations</h3>
                    <p className="text-sm text-gray-400">Manage project branding, themes, and integrations</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary-500 transition-colors"
            onClick={() => navigate('/admin/coaching-analytics')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary-500/10 rounded-lg">
                    <BrainCircuit className="h-6 w-6 text-primary-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">AI Coaching Analytics</h3>
                    <p className="text-sm text-gray-400">Monitor AI coach usage and configure behavior</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 text-primary-500 mr-2" />
              User Management
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage roles and countries for admin users. Admin users can only see tournaments from their assigned country.
            </p>
          </div>
          {canManageRoles && (
            <Button
              onClick={() => setIsAddAdminModalOpen(true)}
              leftIcon={<Plus size={16} />}
            >
              Add Admin
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
            </div>
          ) : adminUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>No administrator accounts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.email}</TableCell>
                      <TableCell>{getRoleBadge(admin.role)}</TableCell>
                      <TableCell>{getCountryName(admin.country)}</TableCell>
                      <TableCell>{getAccessLevelBadge(admin)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {canManageRoles && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(admin)}
                              title="Manage Role"
                            >
                              <Shield size={16} />
                            </Button>
                          )}
                          {canManageCountries && admin.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(admin)}
                              title="Manage Country"
                            >
                              <Edit size={16} />
                            </Button>
                          )}
                          {canManageRoles && admin.id !== user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteModal(admin)}
                              title="Delete Admin"
                              className="text-error-500 hover:text-error-600"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* View More Button */}
              {!showAllAdmins && adminUsers.length > INITIAL_DISPLAY_COUNT && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={handleViewMore}
                    isLoading={isLoadingMore}
                    className="text-primary-400 hover:text-primary-300"
                  >
                    {isLoadingMore ? 'Loading...' : `View More (${adminUsers.length - INITIAL_DISPLAY_COUNT} remaining)`}
                  </Button>
                </div>
              )}

              {/* View Less Button */}
              {showAllAdmins && adminUsers.length > INITIAL_DISPLAY_COUNT && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDisplayedAdmins(adminUsers.slice(0, INITIAL_DISPLAY_COUNT));
                      setShowAllAdmins(false);
                    }}
                    className="text-primary-400 hover:text-primary-300"
                  >
                    View Less
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      {systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 text-accent-500 mr-2" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <User className="h-8 w-8 text-primary-500" />
                </div>
                <div className="text-2xl font-bold text-white">{systemInfo.totalUsers}</div>
                <div className="text-sm text-gray-400">Total Users</div>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Settings className="h-8 w-8 text-accent-500" />
                </div>
                <div className="text-2xl font-bold text-white">{systemInfo.totalTournaments}</div>
                <div className="text-sm text-gray-400">Total Tournaments</div>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Monitor className="h-8 w-8 text-success-500" />
                </div>
                <div className="text-2xl font-bold text-white">{systemInfo.activeTournaments}</div>
                <div className="text-sm text-gray-400">Active Tournaments</div>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Users className="h-8 w-8 text-secondary-500" />
                </div>
                <div className="text-2xl font-bold text-white">{systemInfo.totalRegistrations}</div>
                <div className="text-sm text-gray-400">Total Registrations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Admin Modal */}
      <Modal
        isOpen={isAddAdminModalOpen}
        onClose={() => {
          setIsAddAdminModalOpen(false);
          resetAddAdminForm();
        }}
        title="Add Administrator"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddAdminModalOpen(false);
                resetAddAdminForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAdmin}
              isLoading={isCreatingAdmin}
              leftIcon={<Plus size={16} />}
            >
              Create Administrator
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={newAdminPassword}
            onChange={(e) => setNewAdminPassword(e.target.value)}
            placeholder="Enter a secure password"
            required
          />

          {canManageRoles && (
            <Select
              label="Role"
              value={newAdminRole}
              onChange={(e) => {
                const role = e.target.value as 'admin' | 'super_admin' | 'master_admin';
                setNewAdminRole(role);
                // Clear country when role is not admin
                if (role !== 'admin') {
                  setNewAdminCountry('');
                }
              }}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'super_admin', label: 'Super Admin' },
                { value: 'master_admin', label: 'Master Admin' }
              ]}
            />
          )}

          {newAdminRole === 'admin' && (
            <Select
              label="Country"
              value={newAdminCountry}
              onChange={(e) => setNewAdminCountry(e.target.value)}
              options={[
                { value: '', label: 'Select a country' },
                ...countries.map(country => ({
                  value: country.value,
                  label: `${country.flag} ${country.label}`
                }))
              ]}
              required
            />
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Role Permissions:</h4>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li><strong>Admin:</strong> Can manage tournaments from their assigned country only</li>
              <li><strong>Super Admin:</strong> Can manage all tournaments across all countries</li>
              <li><strong>Master Admin:</strong> Full system access including user management</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={isEditAdminModalOpen}
        onClose={() => {
          setIsEditAdminModalOpen(false);
          setSelectedAdmin(null);
        }}
        title="Edit Administrator"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditAdminModalOpen(false);
                setSelectedAdmin(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditAdmin}
              isLoading={isUpdatingAdmin}
              leftIcon={<Edit size={16} />}
            >
              Update Administrator
            </Button>
          </div>
        }
      >
        {selectedAdmin && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-dark-200 rounded-md text-gray-600 dark:text-gray-400">
                {selectedAdmin.email}
              </div>
            </div>

            {canManageRoles && (
              <Select
                label="Role"
                value={editAdminRole}
                onChange={(e) => {
                  const role = e.target.value as 'admin' | 'super_admin' | 'master_admin';
                  setEditAdminRole(role);
                  // Clear country when role is not admin
                  if (role !== 'admin') {
                    setEditAdminCountry('');
                  }
                }}
                options={[
                  { value: 'admin', label: 'Admin' },
                  { value: 'super_admin', label: 'Super Admin' },
                  { value: 'master_admin', label: 'Master Admin' }
                ]}
              />
            )}

            {editAdminRole === 'admin' && (
              <Select
                label="Country"
                value={editAdminCountry}
                onChange={(e) => setEditAdminCountry(e.target.value)}
                options={[
                  { value: '', label: 'Select a country' },
                  ...countries.map(country => ({
                    value: country.value,
                    label: `${country.flag} ${country.label}`
                  }))
                ]}
              />
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">Current Access:</h4>
              <div className="text-xs text-yellow-800 dark:text-yellow-300">
                {editAdminRole === 'master_admin' && "Full system access including user management"}
                {editAdminRole === 'super_admin' && "Can manage all tournaments across all countries"}
                {editAdminRole === 'admin' && editAdminCountry && `Can manage tournaments from ${getCountryName(editAdminCountry)} only`}
                {editAdminRole === 'admin' && !editAdminCountry && "No access - country assignment required"}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Admin Modal */}
      <Modal
        isOpen={isDeleteAdminModalOpen}
        onClose={() => {
          setIsDeleteAdminModalOpen(false);
          setSelectedAdmin(null);
        }}
        title="Delete Administrator"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteAdminModalOpen(false);
                setSelectedAdmin(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAdmin}
              isLoading={isDeletingAdmin}
              leftIcon={<Trash2 size={16} />}
            >
              Delete Administrator
            </Button>
          </div>
        }
      >
        {selectedAdmin && (
          <div className="space-y-4">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-white">Are you sure you want to delete this administrator?</h3>
                <p className="text-gray-400 mt-1">
                  This action will permanently delete the administrator account and cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-dark-200 p-3 rounded-md">
              <p className="text-sm text-gray-400">Administrator Email:</p>
              <p className="font-medium text-white">{selectedAdmin.email}</p>
              <p className="text-sm text-gray-400 mt-2">Role:</p>
              <div>{getRoleBadge(selectedAdmin.role)}</div>
              {selectedAdmin.country && (
                <>
                  <p className="text-sm text-gray-400 mt-2">Country:</p>
                  <p className="text-white">{getCountryName(selectedAdmin.country)}</p>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPage;
