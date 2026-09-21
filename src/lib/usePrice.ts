import { useCallback } from "react";
import { usePrefs } from "@/state/prefs";
import { convert, money } from "./format";

export interface PriceText {
  /** What to show large: the amount in the preferred currency, prefixed "≈ " when it was converted. */
  text: string;
  /** The listing's own price, set only when `text` is a conversion. */
  original: string | null;
  converted: boolean;
}

/**
 * Formats a price for the user's preferred currency. Same currency → plain; another currency → "≈ " + the
 * converted amount. Without usable rates (first launch offline) the original price is shown as-is.
 */
export function usePrice() {
  const locale = usePrefs((s) => s.locale);
  const preferred = usePrefs((s) => s.currency);
  const rates = usePrefs((s) => s.rates);
  return useCallback((cents: number, currency: string, decimals = 2): PriceText => {
    const own = money(cents, currency, locale, decimals);
    if (currency === preferred) return { text: own, original: null, converted: false };
    const c = convert(cents, currency, preferred, rates);
    if (c == null) return { text: money(cents, currency, locale), original: null, converted: false };
    return { text: `≈ ${money(c, preferred, locale, decimals)}`, original: money(cents, currency, locale), converted: true };
  }, [locale, preferred, rates]);
}
