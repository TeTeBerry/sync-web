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

function formatAmountDigits(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function moneyPrefix(locale: Locale, approx: boolean): string {
  if (!approx) return '';
  return locale === 'en' ? 'About ' : '约 ';
}

export function formatDisplayMoney(
  amount: number,
  from: DisplayCurrency,
  locale: Locale,
  options?: { approx?: boolean; suffix?: string },
): string {
  const currency = displayCurrencyForLocale(locale);
  const rounded = toDisplayAmount(amount, from, locale);
  const symbol = currency === 'USD' ? '$' : '¥';
  const approx = options?.approx !== false;
  const suffix = options?.suffix ?? '';
  return `${moneyPrefix(locale, approx)}${symbol}${formatAmountDigits(rounded, locale)}${suffix}`;
}

/** Format a CNY-authored (or other source) min–max band into the locale display currency. */
export function formatDisplayMoneyRange(
  min: number,
  max: number,
  from: DisplayCurrency,
  locale: Locale,
  options?: { approx?: boolean; suffix?: string; plus?: boolean },
): string {
  const currency = displayCurrencyForLocale(locale);
  const a = Math.round(toDisplayAmount(min, from, locale));
  const b = Math.round(toDisplayAmount(max, from, locale));
  const symbol = currency === 'USD' ? '$' : '¥';
  const approx = options?.approx !== false;
  const suffix = options?.suffix ?? '';
  const prefix = moneyPrefix(locale, approx);
  if (options?.plus) {
    return `${prefix}${symbol}${formatAmountDigits(a, locale)}+${suffix}`;
  }
  if (a === b) {
    return `${prefix}${symbol}${formatAmountDigits(a, locale)}${suffix}`;
  }
  return `${prefix}${symbol}${formatAmountDigits(a, locale)}–${formatAmountDigits(b, locale)}${suffix}`;
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
