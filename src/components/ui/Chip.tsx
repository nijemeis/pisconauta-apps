import { Pressable, View } from "react-native";
import { useTheme } from "@/theme";
import { Body, Mono } from "./Text";

interface Props {
  label: string;
  selected?: boolean;
  /** "fill" = accent fill when selected (filters); "border" = accent border when selected (valley rail). */
  variant?: "fill" | "border" | "note";
  onPress?: () => void;
  onRemove?: () => void;
  count?: number;
  disabled?: boolean;
  dashed?: boolean;
}

export function Chip({ label, selected, variant = "fill", onPress, onRemove, count, disabled, dashed }: Props) {
  const t = useTheme();
  const filled = selected && variant === "fill";
  const note = variant === "note";
  const borderColor = note ? t.goldA(0.4) : selected ? t.gold : t.hair(0.16);
  const ink = filled ? t.onGold : selected && variant === "border" ? t.gold : t.ink2;
  return (
    <Pressable
      disabled={disabled || (!onPress && !onRemove)}
      onPress={onPress ?? onRemove}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={{
        flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor, borderStyle: dashed ? "dashed" : "solid",
        backgroundColor: filled ? t.gold : "transparent", paddingVertical: 7, paddingHorizontal: 12, opacity: disabled ? 0.4 : 1,
        borderRadius: note && t.name === "light" ? 999 : 0,
      }}
    >
      <Body size={12} color={ink} lh={1.3}>{label}</Body>
      {count != null && <Mono size={10} ls={0.06} color={filled ? t.onGold : t.muted3}>{count}</Mono>}
      {onRemove && <Body size={12} color={ink} lh={1.3}>✕</Body>}
    </Pressable>
  );
}

/** Mono applied-filter chip (FILTROS · 3, MOSTO VERDE ✕). */
export function FilterTag({ label, solid, onPress, onRemove }: { label: string; solid?: boolean; onPress?: () => void; onRemove?: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress ?? onRemove} accessibilityRole="button" style={{ flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: solid ? t.gold : t.hair(0.16), backgroundColor: solid ? t.gold : "transparent" }}>
      <Mono size={10} ls={0.16} color={solid ? t.onGold : t.ink2}>{label}</Mono>
      {onRemove && <Mono size={10} ls={0} color={t.ink2}>✕</Mono>}
    </Pressable>
  );
}

export function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}
