import { countries } from '../data/countries';

export const getFirstCountryCode = (eligibleCountries: string | null): string | null => {
  if (!eligibleCountries) return null;
  const codes = eligibleCountries.split(',').map(code => code.trim());
  return codes.length > 0 ? codes[0] : null;
};

export const getCountryInfo = (countryCode: string | null) => {
  if (!countryCode) return null;
  return countries.find(c => c.value === countryCode) || null;
};

export const getCountryDisplay = (eligibleCountries: string | null) => {
  const firstCode = getFirstCountryCode(eligibleCountries);
  if (!firstCode) return null;
  return getCountryInfo(firstCode);
};
