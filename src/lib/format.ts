import type { AwardLevel, Currency, FlavourAxis, PiscoCard, PiscoStatus, PiscoStyle, RatingCriterion, Rates, StillType } from "@/api/types";
import type { Locale } from "@/state/prefs";

/** Spanish uses a decimal comma (4,6); English keeps the point. */
export function num(n: number, locale: Locale, decimals = 1): string {
  const s = n.toFixed(decimals);
  return locale === "en" ? s : s.replace(".", ",");
}

/** Trims a trailing ,0 for values such as ABV that read better as "42 %" when whole. */
export function numTrim(n: number, locale: Locale): string {
  return Number.isInteger(n) ? String(n) : num(n, locale);
}

export const rating = (n: number | null | undefined, locale: Locale) => (n == null ? "—" : num(n, locale));
export const abv = (n: number | null | undefined, locale: Locale) => (n == null ? null : `${num(n, locale)} %`);
export const size = (ml: number | null | undefined) => (ml == null ? null : `${ml} ml`);

export function soles(cents: number | null | undefined, locale: Locale): string | null {
  if (cents == null) return null;
  const v = cents / 100;
  return `S/ ${Number.isInteger(v) ? v : num(v, locale, 2)}`;
}

export const CURRENCY_SYMBOL: Record<Currency, string> = { PEN: "S/", USD: "US$", EUR: "€" };

/** Listing price: PEN → "S/ 89,00", USD → "US$ 25,00", EUR → "€ 23,00" (two decimals unless told otherwise). */
export function money(cents: number, currency: string, locale: Locale, decimals = 2): string {
  const sym = (CURRENCY_SYMBOL as Record<string, string>)[currency] ?? currency;
  return `${sym} ${num(cents / 100, locale, decimals)}`;
}

/** Converts through the sol (rates are units per 1 PEN). Null when the rates are missing or unusable. */
export function convert(cents: number, from: string, to: string, rates: Rates | null | undefined): number | null {
  if (from === to) return cents;
  const perPen = rates?.perPen as Record<string, number> | undefined;
  const a = perPen?.[from]; const b = perPen?.[to];
  if (!a || !b || !(a > 0) || !(b > 0)) return null;
  return Math.round((cents / a) * b);
}

/** Rating criteria, in tasting order. Spanish label + English gloss. */
export const CRITERIA: RatingCriterion[] = ["aroma", "sabor", "cuerpo", "final", "equilibrio"];
export const CRITERION_LABEL: Record<RatingCriterion, { es: string; en: string; short: string }> = {
  aroma: { es: "Aroma", en: "NOSE", short: "AROMA" },
  sabor: { es: "Sabor", en: "PALATE", short: "SABOR" },
  cuerpo: { es: "Cuerpo y textura", en: "BODY", short: "CUERPO" },
  final: { es: "Final", en: "FINISH", short: "FINAL" },
  equilibrio: { es: "Equilibrio", en: "BALANCE", short: "EQUILIBRIO" },
};

/** Pisco terminology stays Spanish in both locales. */
export const STYLE_LABEL: Record<PiscoStyle, string> = { puro: "Puro", acholado: "Acholado", mosto_verde: "Mosto Verde" };
export const STILL_LABEL: Record<StillType, string> = { falca: "Falca", alambique_cobre: "Alambique de cobre", otro: "Otro" };
export const AWARD_LABEL: Record<AwardLevel, { es: string; en: string }> = {
  gran_oro: { es: "Gran Medalla de Oro", en: "Grand Gold Medal" },
  oro: { es: "Medalla de Oro", en: "Gold Medal" },
  plata: { es: "Medalla de Plata", en: "Silver Medal" },
  bronce: { es: "Medalla de Bronce", en: "Bronze Medal" },
};
export const AXES: FlavourAxis[] = ["cuerpo", "dulzor", "herbal", "citrico", "floral", "alcohol"];
export const AXIS_LABEL: Record<FlavourAxis, string> = { cuerpo: "CUERPO", dulzor: "DULZOR", herbal: "HERBAL", citrico: "CÍTRICO", floral: "FLORAL", alcohol: "ALCOHOL" };
export const STATUS_LABEL: Record<PiscoStatus, { es: string; en: string }> = {
  draft: { es: "BORRADOR", en: "DRAFT" },
  in_review: { es: "EN REVISIÓN", en: "IN REVIEW" },
  published: { es: "PUBLICADO", en: "PUBLISHED" },
  archived: { es: "ARCHIVADO", en: "ARCHIVED" },
};

const MONTHS_ES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DIC"];
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** 12 SET 2026 — Peruvian abbreviation for September is SET. */
export function shortDate(iso: string | null | undefined, locale: Locale): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, "0")} ${(locale === "en" ? MONTHS_EN : MONTHS_ES)[d.getMonth()]} ${d.getFullYear()}`;
}

/** Mono meta line under a card: 42,8 % · 700 ML · 2021 */
export function cardMeta(p: PiscoCard, locale: Locale): string {
  return [abv(p.abvPct, locale), p.bottleSizeMl ? `${p.bottleSizeMl} ML` : null, p.vintage].filter(Boolean).join(" · ");
}

export const placeLine = (p: PiscoCard) => [p.producer.name, p.valley ?? p.region?.name].filter(Boolean).join(" · ");
