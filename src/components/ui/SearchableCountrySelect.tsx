import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, Globe } from 'lucide-react';
import {
  allCountries,
  popularCountries,
  filterCountries,
  getCountryByIso,
  CountryData
} from '../../data/allCountries';

interface SearchableCountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_RESULTS = 10;

const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder = 'Search for a country...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedCountry = value ? getCountryByIso(value) : null;

  const getDisplayedCountries = useCallback((): { popular: CountryData[]; all: CountryData[] } => {
    if (searchTerm.trim()) {
      const filtered = filterCountries(searchTerm, allCountries, MAX_RESULTS);
      return { popular: [], all: filtered };
    }
    return { popular: popularCountries, all: [] };
  }, [searchTerm]);

  const displayedCountries = getDisplayedCountries();
  const totalOptions = displayedCountries.popular.length + displayedCountries.all.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (listRef.current && isOpen) {
      const highlightedElement = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, totalOptions - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (totalOptions > 0) {
          const allOptions = [...displayedCountries.popular, ...displayedCountries.all];
          const selected = allOptions[highlightedIndex];
          if (selected) {
            handleSelect(selected.value);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (countryValue: string) => {
    onChange(countryValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const highlightMatch = (text: string, search: string): React.ReactNode => {
    if (!search.trim()) return text;

    const normalizedSearch = search.toLowerCase();
    const normalizedText = text.toLowerCase();
    const index = normalizedText.indexOf(normalizedSearch);

    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <span className="bg-primary-500/30 text-primary-300 font-medium">
          {text.slice(index, index + search.length)}
        </span>
        {text.slice(index + search.length)}
      </>
    );
  };

  const renderCountryOption = (country: CountryData, index: number) => {
    const isHighlighted = index === highlightedIndex;
    const isSelected = country.value === value;

    return (
      <button
        key={`${country.value}-${index}`}
        type="button"
        data-index={index}
        onClick={() => handleSelect(country.value)}
        className={`
          w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
          ${isHighlighted ? 'bg-dark-200' : 'hover:bg-dark-200/50'}
          ${isSelected ? 'bg-primary-500/10' : ''}
        `}
      >
        <span className="text-lg flex-shrink-0">{country.flag}</span>
        <span className="flex-1 min-w-0 truncate text-sm text-white">
          {highlightMatch(country.label, searchTerm)}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {country.dialCode}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-error-500">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`
            w-full flex items-center gap-2 px-3 py-2 text-left
            bg-dark-300 rounded-lg transition-all
            border ${error ? 'border-error-500' : isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-dark-200'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-dark-100'}
          `}
        >
          <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />

          {selectedCountry ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="text-sm text-white truncate">{selectedCountry.label}</span>
              <span className="text-xs text-gray-400">({selectedCountry.dialCode})</span>
            </div>
          ) : (
            <span className="flex-1 text-sm text-gray-500">{placeholder}</span>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedCountry && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-dark-200 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-dark-300 border border-dark-200 rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b border-dark-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to search..."
                  className="
                    w-full pl-9 pr-3 py-2 text-sm
                    bg-dark-400 border border-dark-100 rounded-lg
                    text-white placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
                  "
                />
              </div>
            </div>

            <div
              ref={listRef}
              className="max-h-[280px] overflow-y-auto"
            >
              {!searchTerm.trim() ? (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-dark-400/50">
                    Popular Countries
                  </div>
                  {displayedCountries.popular.map((country, idx) =>
                    renderCountryOption(country, idx)
                  )}
                  <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-dark-400/50 border-t border-dark-200">
                    All Countries (type to search)
                  </div>
                  <div className="px-3 py-2 text-xs text-gray-500 italic">
                    Start typing to search through 240+ countries...
                  </div>
                </>
              ) : totalOptions > 0 ? (
                displayedCountries.all.map((country, idx) =>
                  renderCountryOption(country, idx)
                )
              ) : (
                <div className="px-3 py-6 text-center text-sm text-gray-400">
                  No countries found for "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-error-500 mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-gray-400 mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default SearchableCountrySelect;
