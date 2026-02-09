import React, { useState, useEffect, useRef } from 'react';
import { Globe, Search, Check, X } from 'lucide-react';
import Input from '../ui/Input';

interface Country {
  value: string;
  label: string;
  flag: string;
}

interface CountrySelectorProps {
  selectedCountries: string[];
  onChange: (countries: string[]) => void;
  countries: Country[];
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountries,
  onChange,
  countries
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleCountry = (countryCode: string) => {
    if (selectedCountries.includes(countryCode)) {
      onChange(selectedCountries.filter(code => code !== countryCode));
    } else {
      onChange([...selectedCountries, countryCode]);
    }
  };

  const filteredCountries = countries.filter(country =>
    country.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-200 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <Globe className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-gray-700 dark:text-gray-300">
            {selectedCountries.length === 0
              ? 'Select countries'
              : `${selectedCountries.length} countries selected`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 max-w-[70%] overflow-hidden">
          {selectedCountries.slice(0, 3).map(code => {
            const country = countries.find(c => c.value === code);
            return country ? (
              <div key={code} className="flex items-center bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 px-2 py-0.5 rounded text-xs">
                <span className="mr-1">{country.flag}</span>
                <span className="truncate max-w-[80px]">{country.label}</span>
              </div>
            ) : null;
          })}
          {selectedCountries.length > 3 && (
            <div className="bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs">
              +{selectedCountries.length - 3} more
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 bottom-full mb-1 w-full bg-white dark:bg-dark-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg"
          style={{ maxHeight: '320px', display: 'flex', flexDirection: 'column' }}
        >
          <div className="p-2 border-b border-gray-200 dark:border-dark-300">
            <Input
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-gray-400" />}
              className="text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '240px' }}>
            {filteredCountries.length === 0 ? (
              <div className="text-center py-2 text-gray-500 dark:text-gray-400 text-sm">
                No countries found
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {filteredCountries.map(country => (
                  <div
                    key={country.value}
                    className={`flex items-center p-2 rounded cursor-pointer ${
                      selectedCountries.includes(country.value)
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-300 text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCountry(country.value);
                    }}
                  >
                    <div className="flex items-center flex-1">
                      <span className="text-xl mr-2">{country.flag}</span>
                      <span className="text-sm">{country.label}</span>
                    </div>
                    {selectedCountries.includes(country.value) && (
                      <Check className="h-4 w-4 text-primary-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-200 dark:border-dark-300 flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedCountries.length} selected
            </span>
            <button
              type="button"
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelector;
