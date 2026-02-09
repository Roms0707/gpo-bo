import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import ThemeToggle from '../ui/ThemeToggle';

const Header: React.FC = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [user?.id]);

  // Determine page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/') return 'Tournaments';
    if (path === '/tournaments/new') return 'Create Tournament';
    if (path === '/statistics') return 'Statistics';
    if (path === '/games') return 'Games';
    if (path === '/fields') return 'Tournament Fields';
    if (path === '/registrations') return 'Player Registrations';
    if (path === '/admin') return 'Admin Configuration';
    if (path === '/support-tickets') return 'Support Tickets';
    if (path.startsWith('/leaderboards')) return 'Leaderboards';

    return 'Gaming Tournaments';
  };

  return (
    <header className="bg-white dark:bg-dark-200 shadow-sm h-16 fixed top-0 right-0 left-64 z-10 border-b border-gray-200 dark:border-dark-100">
      <div className="h-full px-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{getPageTitle()}</h1>

        <div className="flex items-center space-x-3">
          <ThemeToggle size="sm" />
          <Link to="/admin" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-600 text-white">
              <User size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Admin</span>
              {userRole && (
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {userRole.replace('_', ' ')}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
