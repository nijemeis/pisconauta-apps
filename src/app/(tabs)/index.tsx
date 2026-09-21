import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api/client";
import { Avatar } from "@/components/Avatar";
import { Body, Chip, Display, ErrorState, Mono, PhotoBox, PiscoRailCard, SectionHeader, SkeletonLines } from "@/components/ui";
import { useT } from "@/i18n";
import { abv } from "@/lib/format";
import { useFetch } from "@/lib/useFetch";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { useUi } from "@/state/ui";
import { GUTTER, useTheme } from "@/theme";

function greetingKey(): "discover.morning" | "discover.afternoon" | "discover.evening" {
  const h = new Date().getHours();
  return h < 12 ? "discover.morning" : h < 19 ? "discover.afternoon" : "discover.evening";
}

export default function Discover() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = usePrefs((s) => s.locale);
  const user = useSession((s) => s.user);
  const { data, error, loading, reload } = useFetch(() => api.discover(), []);
  const feature = data?.cataDelDia;

  const openSearch = (pending?: { q?: string; region?: string }) => {
    if (pending) useUi.getState().setPendingSearch(pending);
    router.navigate("/search");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => reload(true)} tintColor={t.gold} />}
    >
      <View style={{ paddingHorizontal: GUTTER, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View style={{ gap: 2 }}>
          <Mono size={10} ls={0.22} color={t.gold}>{`${tr(greetingKey())}${user ? `, ${user.displayName.split(" ")[0]}` : ""}`}</Mono>
          <Display size={34} accessibilityRole="header">{tr("discover.title")}</Display>
        </View>
        <Avatar />
      </View>

      <Pressable onPress={() => openSearch()} accessibilityRole="search" accessibilityLabel={tr("search.placeholder")}
        style={{ marginHorizontal: GUTTER, marginTop: 16, borderWidth: 1, borderColor: t.hair(0.16), paddingVertical: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: t.muted3 }} />
        <Body size={13} color={t.muted3}>{tr("search.placeholder")}</Body>
      </Pressable>

      {error && !data ? <ErrorState message={error.message} retryLabel={tr("common.retry")} onRetry={() => reload()} /> : null}

      {/* Cata del día */}
      {loading && !data ? (
        <View style={{ margin: GUTTER, borderWidth: 1, borderColor: t.goldA(0.3), padding: 14, flexDirection: "row", gap: 14 }}>
          <PhotoBox width={78} height={112} />
          <View style={{ flex: 1, justifyContent: "center" }}><SkeletonLines widths={["40%", "80%", "60%"]} /></View>
        </View>
      ) : feature ? (
        <Pressable onPress={() => router.push(`/pisco/${feature.slug}`)} accessibilityRole="button" accessibilityLabel={`${tr("discover.cata")}: ${feature.name}`}
          style={{ marginHorizontal: GUTTER, marginTop: 20, borderWidth: 1, borderColor: t.goldA(0.3) }}>
          <LinearGradient colors={[t.goldA(0.14), t.goldA(0.02)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14, flexDirection: "row", gap: 14 }}>
            <PhotoBox src={feature.photo} width={78} height={112} w={200} />
            <View style={{ flex: 1, gap: 5 }}>
              <Mono size={10} ls={0.24} color={t.gold}>{tr("discover.cata")}</Mono>
              <Display size={26} numberOfLines={2}>{`${feature.name}`}</Display>
              <Mono size={10} ls={0.14} color={t.muted}>{[feature.varieties.join(" + "), abv(feature.abvPct, locale)].filter(Boolean).join(" · ")}</Mono>
              <Body size={12} color={t.ink3} numberOfLines={2}>{feature.description ?? feature.producer.name}</Body>
            </View>
          </LinearGradient>
        </Pressable>
      ) : null}

      {/* Valles con D.O. */}
      {data ? (
        <>
          <View style={{ paddingHorizontal: GUTTER, marginTop: 26 }}><SectionHeader label={tr("discover.valleys")} /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8, paddingTop: 12 }}>
            {data.regions.map((r) => <Chip key={r.slug} label={r.name} variant="border" onPress={() => openSearch({ region: r.slug })} />)}
          </ScrollView>

          {data.mostoVerde.length ? (
            <>
              <View style={{ paddingHorizontal: GUTTER, marginTop: 26 }}><SectionHeader label={tr("discover.mostoVerde")} /></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12, paddingTop: 14 }}>
                {data.mostoVerde.map((p) => <PiscoRailCard key={p.id} pisco={p} />)}
              </ScrollView>
            </>
          ) : null}

          {data.newest.length ? (
            <>
              <View style={{ paddingHorizontal: GUTTER, marginTop: 26 }}><SectionHeader label={tr("discover.newest")} /></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12, paddingTop: 14 }}>
                {data.newest.map((p) => <PiscoRailCard key={p.id} pisco={p} />)}
              </ScrollView>
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
