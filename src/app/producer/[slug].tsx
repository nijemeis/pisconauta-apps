import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { screenBottom } from "@/lib/insets";
import { api, mediaUrl } from "@/api/client";
import { Crest } from "@/components/Crest";
import { Stripes } from "@/components/motifs";
import { Body, Display, ErrorState, Loading, Mono, OutlineButton, PhotoBox, TabsRow } from "@/components/ui";
import { useT } from "@/i18n";
import { abv, num, rating } from "@/lib/format";
import { useFetch } from "@/lib/useFetch";
import { usePrefs } from "@/state/prefs";
import { useTheme } from "@/theme";

type Tab = "piscos" | "historia" | "visitas";

export default function ProducerProfile() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = usePrefs((s) => s.locale);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: b, error, loading, reload } = useFetch(() => api.producer(slug), [slug]);
  const [tab, setTab] = useState<Tab>("piscos");
  const cover = mediaUrl(b?.cover, 1200);

  const back = (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={14} accessibilityRole="button" accessibilityLabel={tr("common.back")}
      style={{ position: "absolute", top: insets.top + 6, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(20,16,14,0.55)", alignItems: "center", justifyContent: "center" }}>
      <Display size={28} color="#F4ECDE" style={{ marginTop: -4 }}>‹</Display>
    </Pressable>
  );

  if (!b) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 60 }}>
        {error ? <ErrorState message={error.message} retryLabel={tr("common.retry")} onRetry={() => reload()} /> : loading ? <Loading /> : null}
        {back}
      </View>
    );
  }

  const meta = [b.valley ? `VALLE DE ${b.valley}` : b.region?.name, b.foundedYear ? `DESDE ${b.foundedYear}` : null, b.verified ? "✓ VERIFICADA" : tr("bodega.unverified")].filter(Boolean).join(" · ");
  const stats = [
    { value: String(b.piscoCount), label: "PISCOS" },
    { value: rating(b.avgRating, locale), label: "PROMEDIO" },
    { value: String(b.medalCount), label: "MEDALLAS" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: screenBottom(insets.bottom, 28) }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 186, backgroundColor: t.card, overflow: "hidden" }}>
          <Stripes />
          {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} /> : null}
          <LinearGradient colors={["rgba(20,16,14,0)", t.name === "dark" ? "rgba(20,16,14,0.9)" : "rgba(247,241,230,0.92)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }} />
        </View>
        <View style={{ alignItems: "center", marginTop: -43, paddingHorizontal: 20 }}>
          <Crest initials={b.crestInitials} />
          <Display size={32} center style={{ marginTop: 12 }} accessibilityRole="header">{b.name}</Display>
          <Mono size={10} ls={0.2} color={t.gold} center style={{ marginTop: 6 }}>{meta}</Mono>
          {b.description ? <Body size={12} lh={1.55} center color={t.ink3} style={{ marginTop: 12 }}>{b.description}</Body> : null}
        </View>

        <View style={{ flexDirection: "row", marginTop: 20, marginHorizontal: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.hair(0.1) }}>
          {stats.map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center", paddingVertical: 14, borderLeftWidth: i ? 1 : 0, borderLeftColor: t.hair(0.1), gap: 2 }}>
              <Display size={26} color={i === 1 ? t.gold : t.ink}>{s.value}</Display>
              <Mono size={10} ls={0.2} color={t.muted3}>{s.label}</Mono>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 14, paddingHorizontal: 20 }}>
          <TabsRow<Tab> center value={tab} onChange={setTab} tabs={[{ value: "piscos", label: "PISCOS" }, { value: "historia", label: "HISTORIA" }, { value: "visitas", label: "VISITAS" }]} />
        </View>

        {tab === "piscos" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, paddingHorizontal: 20, paddingTop: 18 }}>
            {b.piscos.length ? b.piscos.map((p) => (
              <Pressable key={p.id} onPress={() => router.push(`/pisco/${p.slug}`)} accessibilityRole="button" accessibilityLabel={p.name} style={{ width: "47.8%", flexGrow: 1, maxWidth: "48.2%", gap: 6 }}>
                <PhotoBox src={p.photo} w={400} style={{ alignSelf: "stretch" }} />
                <Display size={18} numberOfLines={2}>{p.name}</Display>
                <Mono size={10} ls={0.1} color={t.muted3}>{[p.vintage, abv(p.abvPct, locale), p.avgRating != null ? num(p.avgRating, locale) : null].filter(Boolean).join(" · ")}</Mono>
              </Pressable>
            )) : <Body size={13} color={t.ink4} style={{ paddingVertical: 24 }}>{tr("bodega.noPiscos")}</Body>}
          </View>
        ) : tab === "historia" ? (
          <View style={{ padding: 20 }}>
            <Body size={13} lh={1.6} color={t.ink3}>{b.history ?? tr("bodega.noHistory")}</Body>
          </View>
        ) : (
          <View style={{ padding: 20, gap: 14 }}>
            <Body size={13} lh={1.6} color={t.ink3}>{b.visitInfo ?? tr("bodega.noVisits")}</Body>
            {b.contactPhone ? <Mono size={10} ls={0.16} color={t.ink2}>{`TEL · ${b.contactPhone}`}</Mono> : null}
            {b.contactEmail ? <Mono size={10} ls={0.16} color={t.ink2} upper={false}>{b.contactEmail}</Mono> : null}
            {b.website ? <OutlineButton label={tr("bodega.website")} onPress={() => Linking.openURL(b.website!)} /> : null}
          </View>
        )}
      </ScrollView>
      {back}
    </View>
  );
}
