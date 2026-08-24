'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  type AppLocale,
  readStoredLocale,
  writeStoredLocale,
} from '@/i18n/archetypes';
import { UI_CATALOG, type UiMessages } from '@/i18n/uiCatalog';

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  ui: UiMessages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

export function translateUi(
  locale: AppLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw =
    getPath(UI_CATALOG[locale], key) ?? getPath(UI_CATALOG.en, key) ?? key;
  return interpolate(raw, params);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored) setLocaleState(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale === 'ua' ? 'uk' : locale;
  }, [locale, ready]);

  const setLocale = useCallback((next: AppLocale) => {
    writeStoredLocale(next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translateUi(locale, key, params),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, ui: UI_CATALOG[locale] ?? UI_CATALOG.en }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function useT() {
  return useLocale().t;
}
