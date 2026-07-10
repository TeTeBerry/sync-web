import type { Locale } from './i18n';

/** Reference mid-market rate for EN display conversion only. */
export const CNY_PER_USD = 7.2;

export type DisplayCurrency = 'CNY' | 'USD';

export function displayCurrencyForLocale(locale: Locale): DisplayCurrency {
  return locale === 'en' ? 'USD' : 'CNY';
}

export function toDisplayAmount(
  amount: number,
  from: DisplayCurrency,
  locale: Locale,
): number {
  if (!Number.isFinite(amount)) return 0;
  const to = displayCurrencyForLocale(locale);
  if (from === to) return amount;
  if (from === 'CNY' && to === 'USD') return amount / CNY_PER_USD;
  return amount * CNY_PER_USD;
}

export function formatDisplayMoney(
  amount: number,
  from: DisplayCurrency,
  locale: Locale,
  options?: { approx?: boolean; suffix?: string },
): string {
  const currency = displayCurrencyForLocale(locale);
  const rounded = Math.round(toDisplayAmount(amount, from, locale));
  const symbol = currency === 'USD' ? '$' : '¥';
  const approx = options?.approx !== false;
  const suffix = options?.suffix ?? '';
  if (locale === 'en') {
    return `${approx ? 'About ' : ''}${symbol}${rounded}${suffix}`;
  }
  return `${approx ? '约 ' : ''}${symbol}${rounded}${suffix}`;
}

/**
 * Rewrite ¥ amounts in remote plan copy to USD when locale is EN.
 * Leaves $ amounts untouched. Uses the reference CNY→USD rate.
 */
export function localizeMoneyText(
  text: string | undefined,
  locale: Locale,
): string | undefined {
  if (text == null) return text;
  if (locale !== 'en' || !text) return text;
  return text
    .replace(/约\s*¥\s*([\d,]+(?:\.\d+)?)\s*[–—-]\s*([\d,]+(?:\.\d+)?)/g, (_, a, b) => {
      const min = Math.round(Number(String(a).replace(/,/g, '')) / CNY_PER_USD);
      const max = Math.round(Number(String(b).replace(/,/g, '')) / CNY_PER_USD);
      return `About $${min}–${max}`;
    })
    .replace(/About\s*¥\s*([\d,]+(?:\.\d+)?)\s*[–—-]\s*([\d,]+(?:\.\d+)?)/gi, (_, a, b) => {
      const min = Math.round(Number(String(a).replace(/,/g, '')) / CNY_PER_USD);
      const max = Math.round(Number(String(b).replace(/,/g, '')) / CNY_PER_USD);
      return `About $${min}–${max}`;
    })
    .replace(
      /(?:From|约|起步约|About)?\s*¥\s*([\d,]+(?:\.\d+)?)/gi,
      (_, amount) => {
        const usd = Math.round(Number(String(amount).replace(/,/g, '')) / CNY_PER_USD);
        return `About $${usd}`;
      },
    );
}
