export const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

export const DOMAIN_VALIDATION_ERRORS = {
  EMPTY: 'Domain cannot be empty',
  INVALID_FORMAT: 'Invalid domain format. Use format like: partner-a.example.com',
  TOO_SHORT: 'Domain is too short',
  INVALID_CHARACTERS: 'Domain contains invalid characters',
  STARTS_WITH_HYPHEN: 'Domain parts cannot start with a hyphen',
  ENDS_WITH_HYPHEN: 'Domain parts cannot end with a hyphen',
};

export function normalizeDomain(domain: string): string {
  let normalized = domain.trim().toLowerCase();

  if (normalized.startsWith('www.')) {
    normalized = normalized.substring(4);
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const url = new URL(normalized);
      normalized = url.hostname;
      if (normalized.startsWith('www.')) {
        normalized = normalized.substring(4);
      }
    } catch {
      normalized = normalized.replace(/^https?:\/\//, '');
    }
  }

  return normalized;
}

export function validateDomainFormat(domain: string): { valid: boolean; error?: string } {
  if (!domain || domain.trim().length === 0) {
    return { valid: false, error: DOMAIN_VALIDATION_ERRORS.EMPTY };
  }

  const normalized = normalizeDomain(domain);

  if (normalized.length < 3) {
    return { valid: false, error: DOMAIN_VALIDATION_ERRORS.TOO_SHORT };
  }

  const parts = normalized.split('.');
  for (const part of parts) {
    if (part.startsWith('-')) {
      return { valid: false, error: DOMAIN_VALIDATION_ERRORS.STARTS_WITH_HYPHEN };
    }
    if (part.endsWith('-')) {
      return { valid: false, error: DOMAIN_VALIDATION_ERRORS.ENDS_WITH_HYPHEN };
    }
  }

  if (!DOMAIN_REGEX.test(normalized)) {
    return { valid: false, error: DOMAIN_VALIDATION_ERRORS.INVALID_FORMAT };
  }

  return { valid: true };
}

export function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return normalizeDomain(urlObj.hostname);
  } catch {
    return normalizeDomain(url);
  }
}

export function getCurrentDomain(): string | null {
  if (typeof window === 'undefined') return null;
  return normalizeDomain(window.location.hostname);
}
