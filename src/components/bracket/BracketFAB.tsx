import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Maximize,
  Play,
  Search,
  X,
  Menu,
  Settings,
  Bell
} from 'lucide-react';

interface BracketFABProps {
  tournamentId: string;
  isDraftMode: boolean;
  isUpdatingBracketStatus: boolean;
  onPushBracketLive: () => void;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResultsCount?: number;
  showNotificationPanel?: boolean;
  onToggleNotificationPanel?: () => void;
  hasNotifications?: boolean;
}

const BracketFAB: React.FC<BracketFABProps> = ({
  tournamentId,
  isDraftMode,
  isUpdatingBracketStatus,
  onPushBracketLive,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  searchResultsCount,
  onToggleNotificationPanel,
  hasNotifications
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        if (!searchQuery) {
          setIsSearchOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        setIsSearchOpen(true);
        setIsExpanded(false);
      }
      if (event.key === 'Escape' && isSearchOpen) {
        event.preventDefault();
        onSearchChange('');
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, onSearchChange]);

  const handleFullScreen = () => {
    navigate(`/tournaments/${tournamentId}/bracket/fullscreen`);
  };

  const handleSearchToggle = () => {
    if (isSearchOpen && !searchQuery) {
      setIsSearchOpen(false);
    } else {
      setIsSearchOpen(true);
      setIsExpanded(false);
    }
  };

  const handleSearchClear = () => {
    onSearchChange('');
    setIsSearchOpen(false);
  };

  return (
    <div
      ref={fabRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3"
    >
      {isSearchOpen && (
        <div className="flex items-center bg-dark-300 border border-gray-600 rounded-full shadow-xl px-4 py-2 animate-fade-in">
          <Search className="h-5 w-5 text-gray-400 mr-2" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search matches..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none w-48"
          />
          {searchQuery && (
            <span className="text-xs text-primary-400 mx-2">
              {searchResultsCount ?? 0} found
            </span>
          )}
          <button
            onClick={handleSearchClear}
            className="p-1 hover:bg-dark-200 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="flex flex-col items-end space-y-2 animate-fade-in">
          <button
            onClick={onToggleSidebar}
            className="flex items-center bg-dark-300 hover:bg-dark-200 border border-gray-600 rounded-full px-4 py-3 shadow-lg transition-all duration-200 group"
          >
            <span className="text-sm text-gray-300 mr-3 group-hover:text-white">Controls</span>
            <Settings className="h-5 w-5 text-gray-400 group-hover:text-primary-400" />
          </button>

          <button
            onClick={handleSearchToggle}
            className="flex items-center bg-dark-300 hover:bg-dark-200 border border-gray-600 rounded-full px-4 py-3 shadow-lg transition-all duration-200 group"
          >
            <span className="text-sm text-gray-300 mr-3 group-hover:text-white">Search</span>
            <Search className="h-5 w-5 text-gray-400 group-hover:text-primary-400" />
          </button>

          {onToggleNotificationPanel && (
            <button
              onClick={() => {
                onToggleNotificationPanel();
                setIsExpanded(false);
              }}
              className="flex items-center bg-dark-300 hover:bg-dark-200 border border-gray-600 rounded-full px-4 py-3 shadow-lg transition-all duration-200 group relative"
            >
              <span className="text-sm text-gray-300 mr-3 group-hover:text-white">Notifications</span>
              <Bell className="h-5 w-5 text-gray-400 group-hover:text-primary-400" />
              {hasNotifications && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-error-500 rounded-full animate-pulse" />
              )}
            </button>
          )}

          {isDraftMode && (
            <button
              onClick={() => {
                onPushBracketLive();
                setIsExpanded(false);
              }}
              disabled={isUpdatingBracketStatus}
              className="flex items-center bg-success-600 hover:bg-success-700 rounded-full px-4 py-3 shadow-lg transition-all duration-200 group disabled:opacity-50"
            >
              <span className="text-sm text-white mr-3">Push Live</span>
              {isUpdatingBracketStatus ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="h-5 w-5 text-white" />
              )}
            </button>
          )}

          <button
            onClick={handleFullScreen}
            className="flex items-center bg-primary-600 hover:bg-primary-700 rounded-full px-4 py-3 shadow-lg transition-all duration-200 group"
          >
            <span className="text-sm text-white mr-3">Full Screen</span>
            <Maximize className="h-5 w-5 text-white" />
          </button>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          isExpanded
            ? 'bg-dark-300 border border-gray-600 rotate-45'
            : 'bg-primary-600 hover:bg-primary-700'
        }`}
      >
        {isExpanded ? (
          <X className="h-6 w-6 text-gray-400" />
        ) : (
          <Menu className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
};

export default BracketFAB;
