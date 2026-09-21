import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Chakana } from "@/components/motifs";
import { useTheme } from "@/theme";
import { GoldButton, OutlineButton } from "./Buttons";
import { Sheet } from "./Sheet";
import { Body, Display, Mono } from "./Text";

/** Mono text tabs; the active one is accent with a 1 px underline. */
export function TabsRow<T extends string>({ tabs, value, onChange, center }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; center?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 22, justifyContent: center ? "center" : "flex-start", borderBottomWidth: 1, borderBottomColor: t.hair(0.08) }}>
      {tabs.map((tab) => {
        const on = tab.value === value;
        return (
          <Pressable key={tab.value} onPress={() => onChange(tab.value)} hitSlop={8} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: on ? t.gold : "transparent", marginBottom: -1 }}>
            <Mono size={10} ls={0.2} color={on ? t.gold : t.muted3}>{tab.label}</Mono>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ title, body, cta, onPress }: { title: string; body?: string; cta?: string; onPress?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 14 }}>
      <Chakana size={56} />
      <Display size={24} center>{title}</Display>
      {body ? <Body size={13} center color={t.ink4}>{body}</Body> : null}
      {cta ? <GoldButton label={cta} onPress={onPress} style={{ alignSelf: "stretch", marginTop: 8 }} /> : null}
    </View>
  );
}

export function Loading({ pad = 48 }: { pad?: number }) {
  const t = useTheme();
  return <View style={{ padding: pad, alignItems: "center" }}><ActivityIndicator color={t.gold} /></View>;
}

/** Network/API failure block with a retry. The message comes from the API (Spanish) as-is. */
export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={{ padding: 32, gap: 16, alignItems: "center" }}>
      <Body size={13} center color={t.ink3}>{message}</Body>
      <OutlineButton label={retryLabel} onPress={onRetry} style={{ alignSelf: "stretch" }} />
    </View>
  );
}

/** Text-shimmer stand-in: 1 px lines. */
export function SkeletonLines({ widths = ["70%", "45%"] }: { widths?: (`${number}%`)[] }) {
  const t = useTheme();
  return <View style={{ gap: 12, paddingVertical: 6 }}>{widths.map((w, i) => <View key={i} style={{ width: w, height: 1, backgroundColor: t.hair(0.16) }} />)}</View>;
}

/** Single-choice (or multi-choice) list in a bottom sheet — backs the ▾ selects. */
export function OptionSheet<T extends string | number>({ open, onClose, title, options, selected, onSelect, multi, doneLabel }: {
  open: boolean; onClose: () => void; title: string; options: { value: T; label: string; hint?: string }[]; selected: T[]; onSelect: (v: T) => void; multi?: boolean; doneLabel?: string;
}) {
  const t = useTheme();
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}><Display size={24}>{title}</Display></View>
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <Pressable key={String(o.value)} onPress={() => { onSelect(o.value); if (!multi) onClose(); }} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: t.hair(0.08) }}>
              <View style={{ flexShrink: 1 }}>
                <Display size={20} color={on ? t.gold : t.ink}>{o.label}</Display>
                {o.hint ? <Mono size={10} ls={0.14} color={t.muted3}>{o.hint}</Mono> : null}
              </View>
              {on ? <Chakana size={12} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {multi ? <View style={{ paddingHorizontal: 20, paddingTop: 14 }}><GoldButton label={doneLabel ?? "LISTO"} onPress={onClose} /></View> : null}
    </Sheet>
  );
}
