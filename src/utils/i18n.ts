type Translations = Record<string, string>;

const SUPPORTED_LOCALES = ['en', 'fr', 'es'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const cache = new Map<string, Translations>();
let currentLocale: SupportedLocale = 'en';
let initialized = false;

function detectLocale(): SupportedLocale {
  const languages = navigator.languages ?? [navigator.language];
  for (const lang of languages) {
    const code = lang.split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(code as SupportedLocale)) {
      return code as SupportedLocale;
    }
  }
  return 'en';
}

async function loadNamespace(locale: SupportedLocale, namespace: string): Promise<Translations> {
  const key = `${locale}:${namespace}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(`/locales/${locale}/${namespace}.json`);
    if (!res.ok) throw new Error(`${res.status}`);
    const data: Translations = await res.json();
    cache.set(key, data);
    return data;
  } catch {
    if (locale !== 'en') {
      return loadNamespace('en', namespace);
    }
    return {};
  }
}

export async function initI18n(): Promise<void> {
  if (initialized) return;
  currentLocale = detectLocale();
  await loadNamespace(currentLocale, 'notifications');
  initialized = true;
}

export function getLocale(): string {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
  };
  return localeMap[currentLocale] ?? 'en-US';
}

export function t(key: string, params?: Record<string, string | number>): string {
  const translations = cache.get(`${currentLocale}:notifications`) ?? {};
  let text = translations[key] ?? key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }

  return text;
}
