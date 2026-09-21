import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { Body, Mono } from "./Text";

interface Props {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  pad?: number;
  /** Tighter tracking on one line, for side-by-side CTAs. */
  compact?: boolean;
}

/** Primary CTA: accent fill, ink label, square. Lightens while pressed. */
export function GoldButton({ label, onPress, disabled, loading, style, pad = 16, compact }: Props) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [{ backgroundColor: pressed ? t.goldHover : t.gold, paddingVertical: pad, paddingHorizontal: compact ? 8 : 14, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.45 : 1, minHeight: 46 }, style]}
    >
      {loading ? <ActivityIndicator color={t.onGold} size="small" /> : <Mono size={11} ls={compact ? 0.08 : 0.2} medium color={t.onGold} center numberOfLines={compact ? 1 : undefined} adjustsFontSizeToFit={compact}>{label}</Mono>}
    </Pressable>
  );
}

export function OutlineButton({ label, onPress, disabled, loading, style, pad = 16, mono = true, accent, compact }: Props & { mono?: boolean; accent?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [{ borderWidth: 1, borderColor: accent ? t.gold : t.hair(pressed ? 0.32 : 0.16), paddingVertical: pad - 1, paddingHorizontal: compact ? 8 : 12, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.45 : 1, minHeight: 46 }, style]}
    >
      {loading ? <ActivityIndicator color={t.ink} size="small" />
        : mono ? <Mono size={11} ls={compact ? 0.08 : 0.2} color={accent ? t.gold : t.ink2} center numberOfLines={compact ? 1 : undefined} adjustsFontSizeToFit={compact}>{label}</Mono>
        : <Body size={12} color={t.ink2} center>{label}</Body>}
    </Pressable>
  );
}

/** Small mono text action (LIMPIAR, CANCELAR…). */
export function TextAction({ label, onPress, color }: { label: string; onPress?: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button">
      <Mono size={10} ls={0.18} color={color ?? t.gold}>{label}</Mono>
    </Pressable>
  );
}
