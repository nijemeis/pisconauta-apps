import { rating } from "@/lib/format";
import { usePrefs } from "@/state/prefs";
import { useTheme } from "@/theme";
import { Display } from "./Text";

/** Accent Cormorant score with the locale's decimal mark (4,6 in es-PE). */
export function RatingText({ value, size = 24, color }: { value: number | null | undefined; size?: number; color?: string }) {
  const t = useTheme();
  const locale = usePrefs((s) => s.locale);
  return <Display size={size} color={color ?? t.gold} accessibilityLabel={value == null ? undefined : String(value)}>{rating(value, locale)}</Display>;
}
