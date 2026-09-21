import { useState } from "react";
import { Platform, Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { fonts, useTheme } from "@/theme";
import { Body, Display, Mono } from "./Text";

export function FieldError({ message }: { message?: string | null }) {
  const t = useTheme();
  if (!message) return null;
  return <Body size={12} color={t.error} style={{ marginTop: 6 }} accessibilityLiveRegion="polite">{message}</Body>;
}

interface FieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string | null;
  size?: number;
  /** Archivo body text instead of the Cormorant value face (long text, emails). */
  plain?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Mono label over a Cormorant input on a 1 px underline — accent when focused or filled. No fill, no radius. */
export function Field({ label, error, size = 22, plain, style, value, multiline, ...rest }: FieldProps) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  const active = focus || !!value;
  return (
    <View style={style}>
      <Mono size={10} ls={0.2} color={t.muted2}>{label}</Mono>
      <TextInput
        {...rest}
        value={value}
        multiline={multiline}
        accessibilityLabel={label}
        onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
        placeholderTextColor={t.hair(0.35)}
        selectionColor={t.gold}
        style={[Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null, {
          fontFamily: plain ? fonts.ui : fonts.display, fontSize: plain ? 15 : size, color: t.ink, paddingVertical: 8, paddingHorizontal: 0,
          borderBottomWidth: 1, borderBottomColor: error ? t.error : active ? t.gold : t.hair(0.2), minHeight: multiline ? 84 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }]}
      />
      <FieldError message={error} />
    </View>
  );
}

/** Same field pattern, but opens a picker: value ▾ on an underline. */
export function SelectField({ label, value, placeholder, onPress, error, style, size = 20 }: { label: string; value?: string | null; placeholder?: string; onPress: () => void; error?: string | null; style?: StyleProp<ViewStyle>; size?: number }) {
  const t = useTheme();
  return (
    <View style={style}>
      <Mono size={10} ls={0.2} color={t.muted2}>{label}</Mono>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: error ? t.error : value ? t.gold : t.hair(0.2) }}>
        <Display size={size} color={value ? t.ink : t.hair(0.35)} numberOfLines={1} style={{ flexShrink: 1 }}>{value || placeholder || "—"}</Display>
        <Body size={10} color={t.ink2}>▾</Body>
      </Pressable>
      <FieldError message={error} />
    </View>
  );
}

/** Segmented control: square cells, accent fill on the active one. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T | null | undefined; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", borderWidth: 1, borderColor: t.hair(0.16) }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 11, alignItems: "center", backgroundColor: on ? t.gold : "transparent", borderLeftWidth: i ? 1 : 0, borderLeftColor: t.hair(0.16) }}>
            <Body size={12} color={on ? t.onGold : t.ink2}>{o.label}</Body>
          </Pressable>
        );
      })}
    </View>
  );
}
