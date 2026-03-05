import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { Country } from '../../data/countries';
import {
  getCountryByCode,
  formatPhoneNumber,
  cleanPhoneNumber,
  validatePhoneNumber,
  getFirstEligibleCountry,
  getEligibleCountriesList
} from '../../utils/phoneUtils';

interface PhoneInputProps {
  value?: { countryCode: string; phoneNumber: string };
  onChange: (countryCode: string, phoneNumber: string) => void;
  eligibleCountries?: string | null;
  configCountryIso?: string | null;
  noPrefix?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  eligibleCountries,
  configCountryIso,
  noPrefix = false,
  required = false,
  disabled = false,
  error: externalError,
  label,
  placeholder
}) => {
  const lockedCountry = configCountryIso ? getCountryByCode(configCountryIso) : null;

  const availableCountries = lockedCountry ? [lockedCountry] : getEligibleCountriesList(eligibleCountries);
  const defaultCountry = lockedCountry || getFirstEligibleCountry(eligibleCountries);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(
    noPrefix ? null : (value?.countryCode ? getCountryByCode(value.countryCode) || defaultCountry : defaultCountry)
  );
  const [phoneNumber, setPhoneNumber] = useState(value?.phoneNumber || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const isSingleCountry = availableCountries.length === 1;

  useEffect(() => {
    if (noPrefix) return;
    if (lockedCountry) {
      if (selectedCountry?.value !== lockedCountry.value) {
        setSelectedCountry(lockedCountry);
        onChange(lockedCountry.value, phoneNumber);
      }
      return;
    }
    if (value?.countryCode && value.countryCode !== selectedCountry?.value) {
      const country = getCountryByCode(value.countryCode);
      if (country) {
        setSelectedCountry(country);
      }
    }
    if (value?.phoneNumber !== phoneNumber) {
      setPhoneNumber(value?.phoneNumber || '');
    }
  }, [value, lockedCountry, noPrefix]);

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    onChange(country.value, phoneNumber);
    if (touched) {
      validateAndSetError(phoneNumber, country);
    }
  };

  const validateAndSetError = (phone: string, country: Country | null) => {
    const cleaned = cleanPhoneNumber(phone);
    if (!required && cleaned.length === 0) {
      setInternalError(undefined);
      return;
    }

    if (noPrefix || !country) {
      if (cleaned.length === 0 && required) {
        setInternalError('Phone number is required');
      } else {
        setInternalError(undefined);
      }
      return;
    }

    const validation = validatePhoneNumber(phone, country);
    setInternalError(validation.isValid ? undefined : validation.error);
  };

  const handleNoPrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cleaned = cleanPhoneNumber(input);
    if (cleaned.length <= 20) {
      setPhoneNumber(cleaned);
      onChange('', cleaned);
      if (touched) {
        validateAndSetError(cleaned, null);
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (noPrefix) {
      handleNoPrefixChange(e);
      return;
    }
    const input = e.target.value;
    const cleaned = cleanPhoneNumber(input);

    if (selectedCountry && cleaned.length <= selectedCountry.format.replace(/[^X]/g, '').length + 2) {
      setPhoneNumber(cleaned);
      onChange(selectedCountry.value, cleaned);

      if (touched) {
        validateAndSetError(cleaned, selectedCountry);
      }
    }
  };

  const handleBlur = () => {
    setTouched(true);
    validateAndSetError(phoneNumber, selectedCountry);
  };

  const formattedNumber = (phoneNumber && selectedCountry && !noPrefix)
    ? formatPhoneNumber(phoneNumber, selectedCountry.format)
    : phoneNumber;
  const displayError = externalError || internalError;

  if (noPrefix) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder || 'Enter phone number'}
          className={`
            w-full px-3 py-2
            border rounded-md
            ${displayError ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'}
            bg-white dark:bg-dark-200
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-1
            ${displayError
              ? 'focus:ring-error-500 focus:border-error-500'
              : 'focus:ring-primary-500 focus:border-primary-500'
            }
            disabled:bg-gray-100 dark:disabled:bg-dark-300 disabled:cursor-not-allowed
            transition-colors
          `}
        />

        {displayError && (
          <div className="mt-1 flex items-center text-sm text-error-500">
            <AlertCircle className="h-4 w-4 mr-1" />
            {displayError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative flex">
        <div className="relative">
          <button
            type="button"
            onClick={() => !isSingleCountry && !disabled && setIsDropdownOpen(!isDropdownOpen)}
            disabled={isSingleCountry || disabled}
            className={`
              flex items-center space-x-2 px-3 py-2
              border border-r-0 rounded-l-md
              ${isSingleCountry || disabled
                ? 'bg-gray-100 dark:bg-dark-300 cursor-not-allowed'
                : 'bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer'
              }
              ${displayError ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'}
              transition-colors
              h-[42px]
            `}
          >
            <span className="text-2xl">{selectedCountry?.flag}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedCountry?.dialCode}
            </span>
            {!isSingleCountry && (
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {isDropdownOpen && !isSingleCountry && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-dark-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                {availableCountries.map((country) => (
                  <button
                    key={country.value}
                    type="button"
                    onClick={() => handleCountryChange(country)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-2 text-left
                      hover:bg-gray-100 dark:hover:bg-dark-100
                      ${selectedCountry?.value === country.value ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                      transition-colors
                    `}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {country.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {country.dialCode}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <input
          type="tel"
          value={formattedNumber}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder || (selectedCountry ? selectedCountry.format.replace(/X/g, '0') : '')}
          className={`
            flex-1 px-3 py-2
            border rounded-r-md
            ${displayError ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'}
            bg-white dark:bg-dark-200
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-1
            ${displayError
              ? 'focus:ring-error-500 focus:border-error-500'
              : 'focus:ring-primary-500 focus:border-primary-500'
            }
            disabled:bg-gray-100 dark:disabled:bg-dark-300 disabled:cursor-not-allowed
            transition-colors
          `}
        />
      </div>

      {displayError && (
        <div className="mt-1 flex items-center text-sm text-error-500">
          <AlertCircle className="h-4 w-4 mr-1" />
          {displayError}
        </div>
      )}

      {!displayError && selectedCountry && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Format: {selectedCountry.dialCode} {selectedCountry.format}
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
