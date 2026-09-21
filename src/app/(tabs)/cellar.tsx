import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api/client";
import type { CellarItem } from "@/api/types";
import { Avatar } from "@/components/Avatar";
import { Body, Display, EmptyState, ErrorState, Loading, Mono, PhotoBox, RatingText, TabsRow, TextAction } from "@/components/ui";
import { useT } from "@/i18n";
import { shortDate } from "@/lib/format";
import { useFetch } from "@/lib/useFetch";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { GUTTER, useTheme } from "@/theme";

type Tab = "tasted" | "wishlist" | "lists";

function StatCard({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: t.goldA(0.3), paddingVertical: 12, paddingHorizontal: 14, gap: 4 }}>
      <Mono size={10} ls={0.18} color={t.muted2}>{label}</Mono>
      <Display size={22} numberOfLines={1}>{value}</Display>
    </View>
  );
}

function Row({ item, onRemove }: { item: CellarItem; onRemove?: () => void }) {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const locale = usePrefs((s) => s.locale);
  const p = item.pisco;
  const date = shortDate(item.tastedAt, locale);
  return (
    <Pressable onPress={() => router.push(`/pisco/${p.slug}`)} accessibilityRole="button" accessibilityLabel={p.name}
      style={{ flexDirection: "row", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.hair(0.08) }}>
      <PhotoBox src={p.photo} width={50} height={72} w={200} />
      <View style={{ flex: 1, justifyContent: "center", gap: 3 }}>
        <Display size={20} numberOfLines={2}>{p.name}</Display>
        <Body size={12} color={t.ink4} numberOfLines={1}>{[p.producer.name, p.region?.name].filter(Boolean).join(" · ")}</Body>
        {item.state === "tasted" && date ? <Mono size={10} ls={0.16} color={t.muted3}>{`${tr("cellar.tastedOn")} ${date}`}</Mono> : null}
        {item.state === "wishlist" && onRemove ? <TextAction label={tr("cellar.remove")} color={t.muted3} onPress={onRemove} /> : null}
      </View>
      <View style={{ alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
        <Mono size={10} ls={0.18} color={t.muted3}>{item.state === "tasted" ? tr("cellar.myScore") : tr("cellar.avg")}</Mono>
        <RatingText value={item.state === "tasted" ? item.personalScore : p.avgRating} size={24} />
      </View>
    </Pressable>
  );
}

export default function Cellar() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const version = useSession((s) => s.cellarVersion);
  const { data, error, loading, reload } = useFetch(() => api.cellar(), [version, user?.id], !!user);
  const [tab, setTab] = useState<Tab>("tasted");
  const list = tab === "tasted" ? data?.tasted : tab === "wishlist" ? data?.wishlist : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: GUTTER, paddingBottom: 28 }}
      refreshControl={user ? <RefreshControl refreshing={loading && !!data} onRefresh={() => reload(true)} tintColor={t.gold} /> : undefined}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ gap: 2 }}>
          <Display size={34} accessibilityRole="header">Mi cava</Display>
          <Mono size={10} ls={0.22} color={t.gold}>{`MY CELLAR · ${data?.stats.tastedCount ?? 0} CATADOS`}</Mono>
        </View>
        <Avatar />
      </View>

      {!user ? (
        <EmptyState title={tr("cellar.guestTitle")} body={tr("cellar.guestBody")} cta={tr("onb.create")} onPress={() => router.push("/onboarding")} />
      ) : error && !data ? (
        <ErrorState message={error.message} retryLabel={tr("common.retry")} onRetry={() => reload()} />
      ) : !data ? <Loading /> : (
        <>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <StatCard label={tr("cellar.favVariety")} value={data.stats.favouriteVariety ?? "—"} />
            <StatCard label={tr("cellar.topRegion")} value={data.stats.topRegion ?? "—"} />
          </View>
          <View style={{ marginTop: 18 }}>
            <TabsRow<Tab> value={tab} onChange={setTab} tabs={[{ value: "tasted", label: "CATADOS" }, { value: "wishlist", label: "DESEADOS" }, { value: "lists", label: "LISTAS" }]} />
          </View>
          {tab === "lists" ? (
            <EmptyState title={tr("common.soonTitle")} body={tr("cellar.listsSoon")} />
          ) : list && list.length ? (
            list.map((item) => <Row key={item.pisco.id} item={item} onRemove={() => useSession.getState().removeFromCellar(item.pisco.id)} />)
          ) : tab === "tasted" ? (
            <EmptyState title={tr("cellar.emptyTitle")} body={tr("cellar.emptyBody")} cta={tr("cellar.emptyCta")} onPress={() => router.navigate("/")} />
          ) : (
            <EmptyState title={tr("cellar.wishEmptyTitle")} body={tr("cellar.wishEmptyBody")} cta={tr("cellar.emptyCta")} onPress={() => router.navigate("/")} />
          )}
        </>
      )}
    </ScrollView>
  );
}
