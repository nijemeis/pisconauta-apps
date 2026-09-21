import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bottomPad } from "@/lib/insets";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { api } from "@/api/client";
import type { PiscoDetail, PlaceListing } from "@/api/types";
import { PlaceSheet } from "@/components/PlaceSheet";
import { RateSheet } from "@/components/RateSheet";
import { Chakana, CornerBrackets, SteppedBand, TextileBand } from "@/components/motifs";
import { Body, Chip, ChipWrap, Display, ErrorState, GoldButton, Mono, OutlineButton, PhotoBox, RatingText, SectionHeader, SkeletonLines, TextAction } from "@/components/ui";
import { useT } from "@/i18n";
import { AWARD_LABEL, AXIS_LABEL, CRITERIA, CRITERION_LABEL, STATUS_LABEL, STILL_LABEL, CURRENCY_SYMBOL, STYLE_LABEL, abv, num, shortDate, size, soles } from "@/lib/format";
import { openDirections } from "@/lib/maps";
import { useFetch } from "@/lib/useFetch";
import { usePrice } from "@/lib/usePrice";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { toast } from "@/state/ui";
import { useTheme } from "@/theme";

function HeroGround() {
  const t = useTheme();
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="hero" cx="50%" cy="0%" rx="120%" ry="80%" fx="50%" fy="0%">
          <Stop offset="0" stopColor={t.heroInner} />
          <Stop offset="0.7" stopColor={t.bg} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#hero)" />
    </Svg>
  );
}

function SpecGrid({ cells }: { cells: { label: string; value: string }[] }) {
  const t = useTheme();
  // 1 px gaps over an accent ground draw the grid lines.
  return (
    <View style={{ backgroundColor: t.goldA(0.22), padding: 1, gap: 1 }}>
      {Array.from({ length: Math.ceil(cells.length / 2) }, (_, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 1 }}>
          {[cells[r * 2], cells[r * 2 + 1]].map((c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: t.card, paddingVertical: 14, paddingHorizontal: 16, gap: 4 }}>
              {c ? <><Mono size={10} ls={0.2} color={t.muted2}>{c.label}</Mono><Display size={20}>{c.value}</Display></> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function Ficha() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const locale = usePrefs((s) => s.locale);
  const currency = usePrefs((s) => s.currency);
  const ratesDate = usePrefs((s) => s.rates?.updatedAt ?? null);
  const price = usePrice();
  const requireAuth = useRequireAuth();
  const { data: p, error, reload, setData } = useFetch<PiscoDetail>(() => api.pisco(ref), [ref]);
  const reviews = useFetch(() => api.reviews(ref), [ref]);
  const wished = useSession((s) => (p ? !!s.wishlist[p.id] : false));
  const tasted = useSession((s) => (p ? !!s.tasted[p.id] : false));
  const me = useSession((s) => s.user);
  const [rateOpen, setRateOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const gutter = t.name === "light" ? 22 : 20;
  const published = p?.status === "published";

  const toggleWish = () => {
    if (!p || !requireAuth()) return;
    // A cellar entry has a single state; a tasted bottle already lives in CATADOS.
    if (tasted && !wished) { toast(tr("ficha.alreadyTasted")); return; }
    useSession.getState().toggleWishlist(p.id);
  };
  const openRate = () => { if (requireAuth()) setRateOpen(true); };
  const openPlace = () => { if (requireAuth()) setPlaceOpen(true); };
  const openLink = (url: string) => { Linking.openURL(url).catch(() => toast(tr("buy.linkError"))); };
  const removePlace = async (pl: PlaceListing) => {
    if (!p || removing) return;
    setRemoving(pl.id);
    try {
      await api.deletePlace(pl.id);
      setData({ ...p, prices: p.prices.filter((x) => x.id !== pl.id) });
      toast(tr("buy.removed"));
      reload(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : tr("common.error"));
    } finally { setRemoving(null); }
  };
  const mine = reviews.data?.items.find((r) => r.mine) ?? null;
  const inCava = wished || tasted;

  const header = (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: t.bg }}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={14} accessibilityRole="button" accessibilityLabel={tr("common.back")} style={{ width: 32 }}>
        <Display size={30} color={t.ink}>‹</Display>
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Chakana size={12} /><Mono size={10} ls={0.3} color={t.ink2}>PISCO · D.O. PERÚ</Mono><Chakana size={12} />
      </View>
      <Pressable onPress={toggleWish} disabled={!published} hitSlop={14} accessibilityRole="button" accessibilityState={{ selected: wished }} accessibilityLabel={tr(wished ? "ficha.unsave" : "ficha.save")} style={{ width: 32, alignItems: "flex-end", opacity: published ? 1 : 0.3 }}>
        <Body size={20} lh={1.2} color={inCava ? t.gold : t.ink2}>{inCava ? "♥" : "♡"}</Body>
      </Pressable>
    </View>
  );

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {header}
        {error ? <ErrorState message={error.message} retryLabel={tr("common.retry")} onRetry={() => reload()} /> : (
          <View style={{ alignItems: "center", padding: gutter, gap: 22 }}>
            <SteppedBand />
            <PhotoBox width={188} height={250} border />
            <View style={{ alignSelf: "stretch", alignItems: "center" }}><SkeletonLines widths={["40%", "75%", "55%"]} /></View>
          </View>
        )}
      </View>
    );
  }

  const specs = [
    { label: "ESTILO", value: p.style ? STYLE_LABEL[p.style] : "—" },
    { label: "VARIEDAD", value: p.varietyShares.length ? p.varietyShares.map((v) => (v.sharePct ? `${v.name} ${v.sharePct} %` : v.name)).join(", ") : "—" },
    { label: "ALCOHOL", value: p.abvPct != null ? `${abv(p.abvPct, locale)} vol` : "—" },
    { label: tr("ficha.bottle"), value: size(p.bottleSizeMl) ?? "—" },
    { label: "REPOSO", value: p.restMonths != null ? `${p.restMonths} ${tr(p.restMonths === 1 ? "ficha.month" : "ficha.months")}` : "—" },
    { label: "ALAMBIQUE", value: p.stillType ? `${STILL_LABEL[p.stillType]}${p.distillations ? ` · ${p.distillations}×` : ""}` : "—" },
  ];
  const subtitle = [p.vintage ? `Cosecha ${p.vintage}` : null, p.valley ? `Valle de ${p.valley}` : p.region?.name].filter(Boolean).join(" · ");
  const stores = p.prices.filter((x) => x.inStock).length;
  // minPriceCents is always soles; in another preferred currency it reads "≈ € 24" (no decimals).
  const barPrice = price(p.minPriceCents ?? 0, "PEN", 0);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ paddingHorizontal: gutter, paddingTop: 20, paddingBottom: 22, alignItems: "center" }}>
          <HeroGround />
          <SteppedBand opacity={t.name === "light" ? 0.55 : 0.75} />
          <View style={{ width: 188, height: 250, marginTop: 22 }}>
            <PhotoBox src={p.photo} width={188} height={250} w={600} border label={p.name} />
            <CornerBrackets />
          </View>
          <Pressable onPress={() => router.push(`/producer/${p.producerInfo.slug}`)} hitSlop={8} accessibilityRole="link" style={{ marginTop: 24 }}>
            <Mono size={10} ls={0.26} color={t.gold} center>{p.producerInfo.name}</Mono>
          </Pressable>
          <Display size={42} center style={{ marginTop: 8 }} accessibilityRole="header">{p.name}</Display>
          {subtitle ? <Display size={22} italic center color={t.ink4} style={{ marginTop: 4 }}>{subtitle}</Display> : null}
          {!published ? <Mono size={10} ls={0.2} color={t.terracotta} style={{ marginTop: 10 }}>{STATUS_LABEL[p.status][locale === "en" ? "en" : "es"]}</Mono> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 16 }}>
            <RatingText value={p.avgRating} size={30} />
            <View style={{ width: 1, height: 28, backgroundColor: t.hair(0.16) }} />
            <View>
              <Body size={12} color={t.ink}>{`${p.ratingsCount} ${tr(p.ratingsCount === 1 ? "ficha.review" : "ficha.reviews")}`}</Body>
              {p.ranking ? <Mono size={10} ls={0.16} color={t.muted}>{`RANKING #${p.ranking.position} ${p.ranking.variety}`}</Mono> : null}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: gutter, gap: 26 }}>
          <View style={{ gap: 12 }}>
            <TextileBand />
            <SpecGrid cells={specs} />
          </View>

          {p.description ? <Body size={13} lh={1.6} color={t.ink3}>{p.description}</Body> : null}

          {p.notes.length ? (
            <View style={{ gap: 12 }}>
              <SectionHeader label="NOTAS DE CATA" gloss="TASTING NOTES" />
              <ChipWrap>{p.notes.map((n) => <Chip key={n.id} variant="note" label={locale === "en" ? n.en : n.es} />)}</ChipWrap>
            </View>
          ) : null}

          {p.flavours.length ? (
            <View style={{ gap: 12 }}>
              <SectionHeader label="PERFIL DE SABOR" gloss="FLAVOUR" />
              <View style={{ gap: 12 }}>
                {p.flavours.map((f) => (
                  <View key={f.axis} style={{ gap: 6 }} accessible accessibilityLabel={`${AXIS_LABEL[f.axis]} ${f.value} / 5`}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Mono size={10} ls={0.2} color={t.muted2}>{AXIS_LABEL[f.axis]}</Mono>
                      <Mono size={10} ls={0.1} color={t.ink2}>{num(f.value, locale)}</Mono>
                    </View>
                    <View style={{ height: 3, backgroundColor: t.hair(0.12) }}>
                      <View style={{ height: 3, width: `${Math.min(100, (f.value / 5) * 100)}%`, backgroundColor: f.axis === "dulzor" ? t.terracotta : t.gold }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {p.awards.length ? (
            <View style={{ gap: 12 }}>
              <SectionHeader label="PREMIOS" gloss="AWARDS" />
              {p.awards.map((a) => (
                <Pressable key={a.id} disabled={!a.sourceUrl} onPress={() => a.sourceUrl && Linking.openURL(a.sourceUrl)} style={{ borderWidth: 1, borderColor: t.goldA(0.3) }}>
                  <LinearGradient colors={[t.goldA(0.16), t.goldA(0.02)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}>
                    <Chakana size={36} />
                    <View style={{ flex: 1 }}>
                      <Display size={19}>{AWARD_LABEL[a.level][locale === "en" ? "en" : "es"]}</Display>
                      <Body size={12} color={t.ink4}>{`${a.competition} · ${a.year}`}</Body>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : null}

          {published ? (
            <View style={{ gap: 4 }}>
              <SectionHeader label="DÓNDE COMPRAR" gloss="WHERE TO BUY" />
              {p.prices.length ? p.prices.map((pr) => {
                const web = pr.kind === "webshop" || !!pr.url;
                const canRemove = !!me && (me.role === "admin" || (pr.addedById != null && pr.addedById === me.id));
                const meta = [
                  tr(pr.kind === "webshop" ? "buy.web" : "buy.store"),
                  [pr.address, pr.city].filter(Boolean).join(", ") || null,
                  pr.source === "community" ? tr("buy.community") : pr.source === "producer" ? tr("buy.producer") : null,
                ].filter(Boolean).join(" · ");
                const shown = price(pr.priceCents, pr.currency);
                return (
                  <View key={pr.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.hair(0.08), gap: 8, opacity: removing === pr.id ? 0.4 : 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Display size={20}>{pr.retailer}</Display>
                        <Mono size={10} ls={0.14} color={t.muted3}>{meta}</Mono>
                        {!pr.inStock ? <Mono size={10} ls={0.16} color={t.terracotta}>{tr("ficha.outOfStock")}</Mono> : null}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 2 }}>
                        <Display size={20} color={t.gold}>{shown.text}</Display>
                        {shown.original ? <Mono size={10} ls={0.1} color={t.muted3}>{shown.original}</Mono> : null}
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 24 }}>
                      {web
                        ? (pr.url ? <TextAction label={tr("buy.goWeb")} onPress={() => openLink(pr.url as string)} /> : <View />)
                        : !(pr.address || pr.city || pr.lat != null) ? <View />
                        : <TextAction label={tr("buy.directions")} onPress={() => openDirections({ name: pr.retailer, address: pr.address, city: pr.city, lat: pr.lat, lng: pr.lng }).catch(() => toast(tr("buy.linkError")))} />}
                      {canRemove ? <TextAction label={tr("buy.remove")} color={t.terracotta} onPress={() => removePlace(pr)} /> : null}
                    </View>
                  </View>
                );
              }) : <Body size={13} color={t.ink4} style={{ paddingVertical: 12 }}>{tr("buy.empty")}</Body>}
              {p.prices.some((pr) => price(pr.priceCents, pr.currency).converted) ? (
                <Mono size={10} ls={0.1} color={t.muted3} style={{ marginTop: 10 }}>
                  {shortDate(ratesDate, locale) ? tr("buy.fxNoteDated", { date: shortDate(ratesDate, locale) as string }) : tr("buy.fxNote")}
                </Mono>
              ) : null}
              <OutlineButton label={tr("buy.add")} onPress={openPlace} style={{ marginTop: 12 }} />
            </View>
          ) : null}

          {p.siblings.length ? (
            <View style={{ gap: 12 }}>
              <SectionHeader label="DE LA MISMA BODEGA" gloss="SAME BODEGA" />
              <View style={{ flexDirection: "row", gap: 12 }}>
                {p.siblings.slice(0, 3).map((s) => (
                  <Pressable key={s.id} onPress={() => router.push(`/pisco/${s.slug}`)} style={{ flex: 1, gap: 6 }} accessibilityRole="button" accessibilityLabel={s.name}>
                    <PhotoBox src={s.photo} height={76 * 4 / 3} w={200} style={{ alignSelf: "stretch" }} />
                    <Display size={16} numberOfLines={2}>{s.name}</Display>
                    <Mono size={10} ls={0.1} color={t.muted3}>{[s.vintage, s.avgRating != null ? num(s.avgRating, locale) : null].filter(Boolean).join(" · ")}</Mono>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {p.criteria ? (
            <View style={{ gap: 12 }}>
              <SectionHeader label="VALORACIÓN POR CRITERIO" gloss="BY CRITERION" />
              <View style={{ gap: 12 }}>
                {CRITERIA.map((c) => {
                  const v = p.criteria?.averages[c] ?? 0;
                  return (
                    <View key={c} style={{ gap: 6 }} accessible accessibilityLabel={`${CRITERION_LABEL[c].es} ${num(v, locale)} / 5`}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Mono size={10} ls={0.2} color={t.muted2}>{CRITERION_LABEL[c].es}<Mono size={10} ls={0.2} color={t.muted3}>{`  /  ${CRITERION_LABEL[c].en}`}</Mono></Mono>
                        <Mono size={10} ls={0.1} color={t.ink2}>{num(v, locale)}</Mono>
                      </View>
                      <View style={{ height: 3, backgroundColor: t.hair(0.12) }}>
                        <View style={{ height: 3, width: `${Math.max(0, Math.min(100, (v / 5) * 100))}%`, backgroundColor: t.gold }} />
                      </View>
                    </View>
                  );
                })}
              </View>
              <Mono size={10} ls={0.16} color={t.muted3}>{tr(p.criteria.count === 1 ? "ficha.starReview" : "ficha.starReviews", { count: p.criteria.count })}</Mono>
            </View>
          ) : null}

          {published ? (
            <View style={{ gap: 4 }}>
              <SectionHeader label="RESEÑAS" gloss="REVIEWS" />
              {reviews.data?.items.length ? reviews.data.items.map((r) => (
                <View key={r.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.hair(0.08), gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Body size={13} weight="medium" color={t.ink}>{r.author}{r.mine ? ` · ${tr("ficha.you")}` : ""}</Body>
                      <Mono size={10} ls={0.16} color={t.muted3}>{shortDate(r.createdAt, locale)}</Mono>
                    </View>
                    <RatingText value={r.score} size={24} />
                  </View>
                  {r.criteria ? <Mono size={10} ls={0.12} color={t.muted2}>{CRITERIA.map((c) => `${CRITERION_LABEL[c].short} ${r.criteria?.[c] ?? "—"}`).join(" · ")}</Mono> : null}
                  {r.body ? <Body size={13} lh={1.55} color={t.ink3}>{r.body}</Body> : null}
                </View>
              )) : reviews.loading ? <SkeletonLines /> : (
                <Body size={13} color={t.ink4} style={{ paddingVertical: 12 }}>{tr("ficha.noReviews")}</Body>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      {published ? (
        <View style={{ backgroundColor: t.bar }}>
          <SteppedBand opacity={0.55} style={{ marginTop: -6 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: bottomPad(insets.bottom, 14) }}>
            <View style={{ minWidth: 84 }}>
              <Display size={26}>{p.minPriceCents == null ? `${CURRENCY_SYMBOL[currency]} —` : barPrice.converted ? barPrice.text : soles(p.minPriceCents, locale)}</Display>
              <Mono size={10} ls={0.14} color={t.muted3}>{stores ? `DESDE · ${stores} ${stores === 1 ? "TIENDA" : "TIENDAS"}` : tr("ficha.noPrice")}</Mono>
            </View>
            <OutlineButton compact accent label={tasted ? "MI NOTA ✓" : "CATAR / RATE"} onPress={openRate} style={{ flex: 1 }} pad={14} />
            <GoldButton compact label={inCava ? "EN MI CAVA ✓" : "MI CAVA +"} onPress={toggleWish} style={{ flex: 1 }} pad={14} />
          </View>
        </View>
      ) : null}

      <RateSheet open={rateOpen} onClose={() => setRateOpen(false)} pisco={p} initial={mine ? { criteria: mine.criteria, body: mine.body } : null}
        onSaved={() => { reload(true); reviews.reload(true); }} />
      <PlaceSheet open={placeOpen} onClose={() => setPlaceOpen(false)} pisco={p}
        onAdded={(prices) => { setData({ ...p, prices }); reload(true); }} />
    </View>
  );
}
