export type ThemeName = "dark" | "light";

export interface Tokens {
  name: ThemeName;
  bg: string;
  bar: string;
  card: string;
  heroInner: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  muted: string;
  muted2: string;
  muted3: string;
  gold: string;
  goldHover: string;
  /** Text colour on a gold (accent) fill. */
  onGold: string;
  terracotta: string;
  error: string;
  /** Ink hairline at a given alpha. */
  hair: (a: number) => string;
  /** Accent hairline at a given alpha. */
  goldA: (a: number) => string;
  /** Scrim used behind sheets. */
  scrim: string;
}

export const dark: Tokens = {
  name: "dark",
  bg: "#14100E",
  bar: "#100C0A",
  card: "#1A1411",
  heroInner: "#241A14",
  ink: "#F4ECDE",
  ink2: "#E0D6C6",
  ink3: "#CFC3B0",
  ink4: "#C3B4A0",
  muted: "#BCAC97",
  muted2: "#B0A08D",
  muted3: "#A79683",
  gold: "#C9A24A",
  goldHover: "#E3C77F",
  onGold: "#14100E",
  terracotta: "#B4552F",
  error: "#B4552F",
  hair: (a) => `rgba(244,236,222,${a})`,
  goldA: (a) => `rgba(201,162,74,${a})`,
  scrim: "rgba(8,6,5,0.6)",
};

export const light: Tokens = {
  name: "light",
  bg: "#F7F1E6",
  bar: "#F0E7D8",
  card: "#FFFCF6",
  heroInner: "#EFE5D2",
  ink: "#221A15",
  ink2: "#3A2E26",
  ink3: "#4A3C32",
  ink4: "#55463A",
  muted: "#6B5A4B",
  muted2: "#6B5A4B",
  muted3: "#6B5A4B",
  gold: "#A8451F",
  goldHover: "#C05A30",
  onGold: "#FFFCF6",
  terracotta: "#B4552F",
  error: "#B4552F",
  hair: (a) => `rgba(34,26,21,${a})`,
  goldA: (a) => `rgba(168,69,31,${a})`,
  scrim: "rgba(34,26,21,0.45)",
};

export const themes: Record<ThemeName, Tokens> = { dark, light };

export const fonts = {
  displayLight: "CormorantGaramond_300Light",
  display: "CormorantGaramond_400Regular",
  displayMedium: "CormorantGaramond_500Medium",
  displayItalic: "CormorantGaramond_400Regular_Italic",
  displayLightItalic: "CormorantGaramond_300Light_Italic",
  ui: "Archivo_400Regular",
  uiLight: "Archivo_300Light",
  uiMedium: "Archivo_500Medium",
  uiSemi: "Archivo_600SemiBold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
} as const;

export const GUTTER = 20;
