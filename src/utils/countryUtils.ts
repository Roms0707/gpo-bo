import { countries, Country } from '../data/countries';

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

export const getCountryByIso = (iso: string | null): Country | null => {
  if (!iso) return null;
  return countries.find(c => c.value === iso.toUpperCase()) || null;
};

export const getDialCodeFromIso = (iso: string | null): string | null => {
  const country = getCountryByIso(iso);
  if (!country) return null;
  return country.dialCode.replace('+', '');
};

export const getIsoFromDialCode = (dialCode: string | null): string | null => {
  if (!dialCode) return null;
  const normalized = dialCode.replace('+', '');
  const country = countries.find(c => c.dialCode.replace('+', '') === normalized);
  return country ? country.value : null;
};

export const isValidCountryIso = (iso: string | null): boolean => {
  if (!iso) return false;
  return countries.some(c => c.value === iso.toUpperCase());
};
