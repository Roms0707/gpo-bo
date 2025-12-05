import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface BracketSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultsCount?: number;
  placeholder?: string;
  isFixed?: boolean;
}

const BracketSearchBar: React.FC<BracketSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  resultsCount,
  placeholder = 'Search by player name, team name, or match number...',
  isFixed = false
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus({ preventScroll: true });
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    onSearchChange('');
    searchInputRef.current?.focus({ preventScroll: true });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  return (
    <div className={`bg-dark-400 pb-4 px-8 border-b border-dark-100 transition-all ${
      isFixed ? 'shadow-lg pt-4' : ''
    }`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-5 w-5 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-3 bg-dark-200 border border-dark-100 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        {searchQuery && (
          <div className="absolute right-2 flex items-center space-x-2">
            {resultsCount !== undefined && (
              <span className="text-xs text-gray-400 bg-dark-300 px-2 py-1 rounded">
                {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
              </span>
            )}
            <button
              onClick={handleClear}
              className="p-1 hover:bg-dark-300 rounded transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-white" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Press <kbd className="px-1.5 py-0.5 bg-dark-300 rounded border border-dark-100">Ctrl+F</kbd> or <kbd className="px-1.5 py-0.5 bg-dark-300 rounded border border-dark-100">⌘+F</kbd> to search
      </div>
    </div>
  );
};

export default BracketSearchBar;
