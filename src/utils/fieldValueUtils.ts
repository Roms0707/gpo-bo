export type FieldValue = Record<string, string>;

export function parseFieldValue(value: any): FieldValue {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as FieldValue;
      }
      return { value };
    } catch {
      return { value };
    }
  }

  if (typeof value === 'object' && value !== null) {
    return value as FieldValue;
  }

  return { value: String(value) };
}

export function formatFieldValueForDisplay(value: any): string {
  const parsed = parseFieldValue(value);

  if (Object.keys(parsed).length === 0) {
    return '';
  }

  if ('fullNumber' in parsed && 'countryCode' in parsed) {
    return parsed.fullNumber || '';
  }

  if (Object.keys(parsed).length === 1 && 'value' in parsed) {
    return parsed.value || '';
  }

  return Object.entries(parsed)
    .map(([key, val]) => `${key}: ${val}`)
    .join(', ');
}

export function formatFieldValueForModal(value: any): Array<{ key: string; value: string }> {
  const parsed = parseFieldValue(value);

  if ('fullNumber' in parsed && 'countryCode' in parsed && 'phoneNumber' in parsed) {
    return [
      { key: 'Phone Number', value: parsed.fullNumber || '' }
    ];
  }

  return Object.entries(parsed).map(([key, val]) => ({
    key,
    value: val
  }));
}

export function isLegacyTextValue(value: FieldValue): boolean {
  return Object.keys(value).length === 1 && 'value' in value;
}

export function getAllKeysFromValues(values: any[]): string[] {
  const keysSet = new Set<string>();

  values.forEach(val => {
    const parsed = parseFieldValue(val);
    Object.keys(parsed).forEach(key => {
      if (key !== 'value' || Object.keys(parsed).length > 1) {
        keysSet.add(key);
      }
    });
  });

  return Array.from(keysSet).sort();
}

export function getValueByKey(value: any, key: string): string {
  const parsed = parseFieldValue(value);
  return parsed[key] || '';
}

export function createFieldValue(keyValuePairs: Record<string, string>): FieldValue {
  return keyValuePairs;
}

export function validateFieldValue(value: any): { isValid: boolean; error?: string } {
  try {
    const parsed = parseFieldValue(value);

    if (typeof parsed !== 'object' || parsed === null) {
      return { isValid: false, error: 'Value must be a valid JSON object' };
    }

    const hasNonEmptyValues = Object.values(parsed).some(v => v && v.trim() !== '');
    if (!hasNonEmptyValues) {
      return { isValid: false, error: 'At least one field value must be non-empty' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid JSON structure' };
  }
}
