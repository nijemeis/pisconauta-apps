import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import type { PiscoCard } from "@/api/types";
import { cardMeta, placeLine, rating } from "@/lib/format";
import { usePrefs } from "@/state/prefs";
import { useTheme } from "@/theme";
import { PhotoBox } from "./PhotoBox";
import { RatingText } from "./RatingText";
import { Body, Display, Mono } from "./Text";

/** Search result row: 56 × 80 photo, name, bodega · valley, mono meta, right-aligned rating + count. */
export function PiscoRow({ pisco, onPress }: { pisco: PiscoCard; onPress?: () => void }) {
  const t = useTheme();
  const router = useRouter();
  const locale = usePrefs((s) => s.locale);
  return (
    <Pressable onPress={onPress ?? (() => router.push(`/pisco/${pisco.slug}`))} accessibilityRole="button" accessibilityLabel={`${pisco.name}, ${pisco.producer.name}`}
      style={({ pressed }) => ({ flexDirection: "row", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.hair(0.08), opacity: pressed ? 0.8 : 1 })}>
      <PhotoBox src={pisco.photo} width={56} height={80} />
      <View style={{ flex: 1, justifyContent: "center", gap: 3 }}>
        <Display size={21} numberOfLines={2}>{pisco.name}</Display>
        <Body size={12} color={t.ink4} numberOfLines={1}>{placeLine(pisco)}</Body>
        <Mono size={10} ls={0.14} color={t.muted3}>{cardMeta(pisco, locale)}</Mono>
      </View>
      <View style={{ alignItems: "flex-end", justifyContent: "center", minWidth: 44 }}>
        <RatingText value={pisco.avgRating} size={24} />
        <Mono size={10} ls={0.1} color={t.muted3}>{pisco.ratingsCount}</Mono>
      </View>
    </Pressable>
  );
}

/** Rail card: 124 px wide, 150 px photo, Cormorant 18 name, mono meta. */
export function PiscoRailCard({ pisco, width = 124, photoHeight = 150, nameSize = 18 }: { pisco: PiscoCard; width?: number; photoHeight?: number; nameSize?: number }) {
  const t = useTheme();
  const router = useRouter();
  const locale = usePrefs((s) => s.locale);
  return (
    <Pressable onPress={() => router.push(`/pisco/${pisco.slug}`)} accessibilityRole="button" accessibilityLabel={`${pisco.name}, ${pisco.producer.name}`} style={{ width, gap: 6 }}>
      <PhotoBox src={pisco.photo} width={width} height={photoHeight} />
      <Display size={nameSize} numberOfLines={2}>{pisco.name}</Display>
      <Mono size={10} ls={0.12} color={t.muted3} numberOfLines={1}>{`${pisco.producer.name} · ${rating(pisco.avgRating, locale)}`}</Mono>
    </Pressable>
  );
}
