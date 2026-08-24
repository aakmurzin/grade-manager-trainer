import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import ua from '../../messages/ua.json';
import type { ManagerArchetype } from '@/game/report/computeManagerReport';

export type AppLocale = 'en' | 'ru' | 'ua';

const CATALOG = { en, ru, ua } as const;

/** Default UI language until full next-intl switcher lands (addendum-61). */
export const DEFAULT_LOCALE: AppLocale = 'en';

export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'ua', label: 'Українська' },
];

const LOCALE_STORAGE_KEY = 'grade.locale';

export function isAppLocale(value: string): value is AppLocale {
  return value === 'en' || value === 'ru' || value === 'ua';
}

export function readStoredLocale(): AppLocale | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return raw && isAppLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: AppLocale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode / quota */
  }
}

type ArchetypeKey = keyof typeof en.report.archetypes;

export function messagesFor(locale: AppLocale = DEFAULT_LOCALE) {
  return CATALOG[locale] ?? CATALOG.en;
}

export function archetypeBlurbForLocale(
  archetype: ManagerArchetype | null,
  locale: AppLocale = DEFAULT_LOCALE,
): string | null {
  if (archetype == null) return null;
  const key = archetype as ArchetypeKey;
  const pack = messagesFor(locale);
  return pack.report.archetypes[key] ?? CATALOG.en.report.archetypes[key] ?? null;
}

export function onboardingCopy(locale: AppLocale = DEFAULT_LOCALE) {
  return messagesFor(locale).onboarding;
}
