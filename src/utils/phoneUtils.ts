import { countries, Country } from '../data/countries';

export interface PhoneNumber {
  countryCode: string;
  phoneNumber: string;
  fullNumber: string;
}

export const getCountryByCode = (countryCode: string): Country | null => {
  return countries.find(c => c.value === countryCode) || null;
};

export const getCountryByDialCode = (dialCode: string): Country | null => {
  return countries.find(c => c.dialCode === dialCode) || null;
};

export const getFirstEligibleCountry = (eligibleCountries: string | null): Country | null => {
  if (!eligibleCountries) return countries[0];

  const codes = eligibleCountries.split(',').map(code => code.trim());
  if (codes.length === 0) return countries[0];

  return getCountryByCode(codes[0]);
};

export const getEligibleCountriesList = (eligibleCountries: string | null): Country[] => {
  if (!eligibleCountries) return countries;

  const codes = eligibleCountries.split(',').map(code => code.trim());
  return countries.filter(c => codes.includes(c.value));
};

export const formatPhoneNumber = (phoneNumber: string, format: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  let formatted = '';
  let digitIndex = 0;

  for (let i = 0; i < format.length && digitIndex < cleaned.length; i++) {
    if (format[i] === 'X') {
      formatted += cleaned[digitIndex];
      digitIndex++;
    } else {
      formatted += format[i];
    }
  }

  if (digitIndex < cleaned.length) {
    formatted += cleaned.substring(digitIndex);
  }

  return formatted;
};

export const cleanPhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/\D/g, '');
};

export const validatePhoneNumber = (phoneNumber: string, country: Country): { isValid: boolean; error?: string } => {
  const cleaned = cleanPhoneNumber(phoneNumber);
  const expectedLength = country.format.replace(/[^X]/g, '').length;

  if (cleaned.length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }

  if (cleaned.length < expectedLength) {
    return { isValid: false, error: `Phone number must be at least ${expectedLength} digits` };
  }

  if (cleaned.length > expectedLength + 2) {
    return { isValid: false, error: `Phone number is too long` };
  }

  return { isValid: true };
};

export const parsePhoneValue = (value: any): PhoneNumber | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed.countryCode && parsed.phoneNumber) {
        return {
          countryCode: parsed.countryCode,
          phoneNumber: parsed.phoneNumber,
          fullNumber: parsed.fullNumber || `${getCountryByCode(parsed.countryCode)?.dialCode || ''}${parsed.phoneNumber}`
        };
      }
    } catch (e) {
      const country = countries.find(c => value.startsWith(c.dialCode));
      if (country) {
        const phoneNumber = value.substring(country.dialCode.length);
        return {
          countryCode: country.value,
          phoneNumber: cleanPhoneNumber(phoneNumber),
          fullNumber: value
        };
      }
      return {
        countryCode: countries[0].value,
        phoneNumber: cleanPhoneNumber(value),
        fullNumber: value
      };
    }
  }

  if (typeof value === 'object' && value.countryCode && value.phoneNumber) {
    return {
      countryCode: value.countryCode,
      phoneNumber: value.phoneNumber,
      fullNumber: value.fullNumber || `${getCountryByCode(value.countryCode)?.dialCode || ''}${value.phoneNumber}`
    };
  }

  return null;
};

export const formatPhoneForDisplay = (value: any): string => {
  const parsed = parsePhoneValue(value);
  if (!parsed) return '-';

  const country = getCountryByCode(parsed.countryCode);
  if (!country) return parsed.fullNumber;

  const formatted = formatPhoneNumber(parsed.phoneNumber, country.format);
  return `${country.flag} ${country.dialCode} ${formatted}`;
};

export const formatPhoneForStorage = (countryCode: string, phoneNumber: string): string => {
  const country = getCountryByCode(countryCode);
  const cleaned = cleanPhoneNumber(phoneNumber);
  const fullNumber = `${country?.dialCode || ''}${cleaned}`;

  return JSON.stringify({
    countryCode,
    phoneNumber: cleaned,
    fullNumber
  });
};
