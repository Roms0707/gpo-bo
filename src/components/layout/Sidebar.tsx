import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Gamepad2, ListChecks, Settings, LogOut, ClipboardList, BarChart2, TowerControl as GameController, Image, Trophy, LifeBuoy, FileText, Sparkles, Palette } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSupportTicketStore } from '../../store/supportTicketStore';
import NotificationBadge from '../ui/NotificationBadge';

interface SidebarLink {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const Sidebar: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);
  const canGenerateReports = useAuthStore((state) => state.canGenerateReports);
  const canAccessGamification = useAuthStore((state) => state.canAccessGamification);
  const { unreadCount, fetchUnreadCount } = useSupportTicketStore();

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const allLinks: SidebarLink[] = [
    {
      to: '/',
      icon: <Gamepad2 size={20} />,
      label: 'Tournaments',
    },
    {
      to: '/registrations',
      icon: <ClipboardList size={20} />,
      label: 'Registrations',
    },
    {
      to: '/brackets',
      icon: <Trophy size={20} />,
      label: 'Brackets',
    },
    {
      to: '/gamification',
      icon: <Sparkles size={20} />,
      label: 'Gamification',
    },
    {
      to: '/contents',
      icon: <Image size={20} />,
      label: 'Contents',
    },
    {
      to: '/support-tickets',
      icon: <LifeBuoy size={20} />,
      label: 'Support Tickets',
    },
    {
      to: '/statistics',
      icon: <BarChart2 size={20} />,
      label: 'Statistics',
    },
    {
      to: '/reports',
      icon: <FileText size={20} />,
      label: 'Reports',
    },
    {
      to: '/games',
      icon: <GameController size={20} />,
      label: 'Games',
    },
    {
      to: '/fields',
      icon: <ListChecks size={20} />,
      label: 'Add informations',
    },
    {
      to: '/admin',
      icon: <Settings size={20} />,
      label: 'Admin',
    },
    {
      to: '/admin/project-configurations',
      icon: <Palette size={20} />,
      label: 'Project Configs',
    },
  ];

  const links = allLinks.filter(link => {
    if (link.to === '/reports') {
      return canGenerateReports();
    }
    if (link.to === '/gamification') {
      return canAccessGamification();
    }
    if (link.to === '/admin/project-configurations') {
      return canAccessGamification(); // Only master_admin
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-300 text-gray-900 dark:text-white w-64 fixed left-0 top-0 bottom-0 border-r border-gray-200 dark:border-dark-200">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <Gamepad2 className="h-8 w-8 text-primary-500 dark:text-primary-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            G-Tournaments
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin'}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md transition-colors relative ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <span className="mr-3">{link.icon}</span>
            <span className="flex-1">{link.label}</span>
            {link.to === '/support-tickets' && unreadCount > 0 && (
              <NotificationBadge count={unreadCount} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-200">
        <button
          onClick={() => logout()}
          className="flex items-center w-full px-3 py-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-dark-200 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <LogOut size={20} className="mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;