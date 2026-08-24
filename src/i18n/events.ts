'use client';

import type { AppLocale } from '@/i18n/archetypes';
import { translateUi } from '@/i18n/LocaleProvider';

/** Map engine English event banners to the active locale. */
export function translateEventMessage(locale: AppLocale, message: string): string {
  const failed = message.match(/^Compliance check failed \(−\$(\d+)\)$/);
  if (failed) {
    return translateUi(locale, 'events.complianceFailed', { penalty: failed[1]! });
  }
  if (message === 'Compliance check mitigated by Accountant') {
    return translateUi(locale, 'events.complianceMitigated');
  }
  const need = message.match(/^Need (.+) to fire (.+) \(pro-rata \+ severance\)$/);
  if (need) {
    return translateUi(locale, 'events.fireNeedCash', { cost: need[1]!, name: need[2]! });
  }
  const fired = message.match(
    /^Fired (.+) \(−\$(\d+): pro-rata \$(\d+) \+ severance \$(\d+)\)$/,
  );
  if (fired) {
    return translateUi(locale, 'events.fired', {
      name: fired[1]!,
      total: fired[2]!,
      prorata: fired[3]!,
      severance: fired[4]!,
    });
  }
  return message;
}
