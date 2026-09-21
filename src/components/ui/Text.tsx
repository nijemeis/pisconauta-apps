import { Text, type TextProps, type TextStyle } from "react-native";
import { fonts, useTheme } from "@/theme";

interface Base extends TextProps { size?: number; color?: string; center?: boolean }

/** Cormorant Garamond — titles and values. */
export function Display({ size = 24, color, center, italic, light, style, ...rest }: Base & { italic?: boolean; light?: boolean }) {
  const t = useTheme();
  const fontFamily = italic ? (light ? fonts.displayLightItalic : fonts.displayItalic) : light ? fonts.displayLight : fonts.display;
  return <Text {...rest} style={[{ fontFamily, fontSize: size, lineHeight: Math.round(size * 1.12), color: color ?? t.ink, textAlign: center ? "center" : undefined }, style]} />;
}

/** Archivo — UI copy. */
export function Body({ size = 13, color, center, weight = "regular", lh = 1.5, style, ...rest }: Base & { weight?: "light" | "regular" | "medium" | "semi"; lh?: number }) {
  const t = useTheme();
  const fontFamily = { light: fonts.uiLight, regular: fonts.ui, medium: fonts.uiMedium, semi: fonts.uiSemi }[weight];
  return <Text {...rest} style={[{ fontFamily, fontSize: size, lineHeight: Math.round(size * lh), color: color ?? t.ink3, textAlign: center ? "center" : undefined }, style]} />;
}

/** IBM Plex Mono micro-label; `ls` is letter-spacing in em, as in the design. Never below 10 px. */
export function Mono({ size = 10, color, center, ls = 0.2, medium, upper = true, style, children, ...rest }: Base & { ls?: number; medium?: boolean; upper?: boolean }) {
  const t = useTheme();
  const s = Math.max(10, size);
  const base: TextStyle = {
    fontFamily: medium ? fonts.monoMedium : fonts.mono, fontSize: s, letterSpacing: s * ls, lineHeight: Math.round(s * 1.5),
    color: color ?? t.muted2, textAlign: center ? "center" : undefined, textTransform: upper ? "uppercase" : undefined,
  };
  return <Text {...rest} style={[base, style]}>{children}</Text>;
}

export const MonoLabel = Mono;
