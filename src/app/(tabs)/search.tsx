import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type SearchState } from "@/api/client";
import type { Facets, PiscoCard, PiscoStyle, Sort } from "@/api/types";
import { SuggestSheet } from "@/components/SuggestSheet";
import { Body, Chip, ChipWrap, Display, EmptyState, ErrorState, FilterTag, GoldButton, Mono, OptionSheet, PhotoBox, PiscoRow, Sheet, SkeletonLines, Slider, TextAction } from "@/components/ui";
import { useT, type Key } from "@/i18n";
import { STYLE_LABEL, num } from "@/lib/format";
import { usePrefs } from "@/state/prefs";
import { useUi } from "@/state/ui";
import { GUTTER, fonts, useTheme } from "@/theme";

const EMPTY: SearchState = { q: "", style: [], variety: [], region: [], sort: "rating" };
const SORTS: { value: Sort; key: Key }[] = [
  { value: "rating", key: "search.sort.rating" }, { value: "new", key: "search.sort.new" },
  { value: "price", key: "search.sort.price" }, { value: "name", key: "search.sort.name" },
];
const PRICE_STEPS = [60, 100, 150, 250];
const RATING_STEPS = [4, 4.5];

const WEB_NO_OUTLINE = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function Search() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const locale = usePrefs((s) => s.locale);
  const pending = useUi((s) => s.pendingSearch);

  const [text, setText] = useState("");
  const [state, setState] = useState<SearchState>(EMPTY);
  const [items, setItems] = useState<PiscoCard[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [abvBounds, setAbvBounds] = useState<{ min: number; max: number } | null>(null);
  const [abvDraft, setAbvDraft] = useState<number[] | null>(null);
  const [sheet, setSheet] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [suggest, setSuggest] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // One-shot handoff from Discover chips / the scanner's NO ES ESTE.
  useEffect(() => {
    if (!pending) return;
    setText(pending.q ?? "");
    setState({ ...EMPTY, q: pending.q ?? "", region: pending.region ? [pending.region] : [] });
    useUi.getState().setPendingSearch(null);
  }, [pending]);

  // Debounce the query 250 ms; facet changes apply immediately.
  useEffect(() => {
    if (text === state.q) return;
    const id = setTimeout(() => setState((s) => ({ ...s, q: text })), 250);
    return () => clearTimeout(id);
  }, [text, state.q]);

  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true); setError(null);
    api.search(state, null, ctl.signal)
      .then((r) => { setItems(r.items); setTotal(r.total); setCursor(r.nextCursor); setLoading(false); })
      .catch((e: Error) => { if (e.name !== "AbortError") { setError(e.message); setLoading(false); } });
    api.facets(state, ctl.signal)
      .then((f) => { setFacets(f); setAbvBounds((b) => b ?? (f.abv.max > f.abv.min ? f.abv : b)); })
      .catch(() => {});
    return () => ctl.abort();
  }, [state, reloadKey]);

  const loadMore = async () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const r = await api.search(state, cursor);
      setItems((prev) => { const seen = new Set(prev.map((p) => p.id)); return [...prev, ...r.items.filter((p) => !seen.has(p.id))]; });
      setCursor(r.nextCursor);
    } catch { /* keep the cursor; scrolling again retries */ }
    finally { setLoadingMore(false); }
  };

  const label = (group: "variety" | "region", value: string) => facets?.[group].find((o) => o.value === value)?.label ?? value;
  const applied = useMemo(() => {
    const out: { key: string; label: string; remove: () => void }[] = [];
    state.style.forEach((v) => out.push({ key: `s-${v}`, label: STYLE_LABEL[v], remove: () => setState((s) => ({ ...s, style: s.style.filter((x) => x !== v) })) }));
    state.variety.forEach((v) => out.push({ key: `v-${v}`, label: label("variety", v), remove: () => setState((s) => ({ ...s, variety: s.variety.filter((x) => x !== v) })) }));
    state.region.forEach((v) => out.push({ key: `r-${v}`, label: label("region", v), remove: () => setState((s) => ({ ...s, region: s.region.filter((x) => x !== v) })) }));
    if (state.abvMin != null || state.abvMax != null) out.push({ key: "abv", label: `${num(state.abvMin ?? abvBounds?.min ?? 0, locale, 0)} – ${num(state.abvMax ?? abvBounds?.max ?? 0, locale, 0)} %`, remove: () => setState((s) => ({ ...s, abvMin: undefined, abvMax: undefined })) });
    if (state.priceMax != null) out.push({ key: "price", label: `≤ S/ ${state.priceMax}`, remove: () => setState((s) => ({ ...s, priceMax: undefined })) });
    if (state.ratingMin != null) out.push({ key: "rating", label: `${num(state.ratingMin, locale)}+`, remove: () => setState((s) => ({ ...s, ratingMin: undefined })) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, facets, locale, abvBounds]);

  const clearAll = () => { setState((s) => ({ ...EMPTY, q: s.q, sort: s.sort })); setAbvDraft(null); };
  const abvValues = abvDraft ?? (abvBounds ? [state.abvMin ?? abvBounds.min, state.abvMax ?? abvBounds.max] : null);
  const active = focused || !!text;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: GUTTER }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: active ? t.gold : t.hair(0.16), paddingHorizontal: 14 }}>
          <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: active ? t.gold : t.muted3 }} />
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={tr("search.placeholder")}
            placeholderTextColor={t.muted3}
            selectionColor={t.gold}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={tr("search.placeholder")}
            style={[{ flex: 1, fontFamily: fonts.ui, fontSize: 13, color: t.ink, paddingVertical: 13 }, WEB_NO_OUTLINE]}
          />
          {text ? <Pressable onPress={() => { setText(""); inputRef.current?.focus(); }} hitSlop={12} accessibilityLabel={tr("search.clear")}><Body size={13} color={t.ink2}>✕</Body></Pressable> : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8, paddingTop: 12, alignItems: "center" }}>
        <FilterTag solid label={applied.length ? `${tr("search.filters")} · ${applied.length}` : tr("search.filters")} onPress={() => setSheet(true)} />
        {applied.map((a) => <FilterTag key={a.key} label={a.label} onRemove={a.remove} />)}
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Mono size={10} ls={0.2} color={t.muted3}>{total == null ? "…" : `${total} ${tr(total === 1 ? "search.result" : "search.results")}`}</Mono>
        <Pressable onPress={() => setSortOpen(true)} hitSlop={10} accessibilityRole="button">
          <Mono size={10} ls={0.18} color={t.gold}>{`${tr(SORTS.find((s) => s.value === state.sort)!.key)} ▾`}</Mono>
        </Pressable>
      </View>

      {error ? <ErrorState message={error} retryLabel={tr("common.retry")} onRetry={() => setReloadKey((k) => k + 1)} /> : loading && !items.length ? (
        <View style={{ paddingHorizontal: GUTTER }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.hair(0.08) }}>
              <PhotoBox width={56} height={80} />
              <View style={{ flex: 1, justifyContent: "center" }}><SkeletonLines /></View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PiscoRow pisco={item} />}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReachedThreshold={0.6}
          onEndReached={loadMore}
          style={{ opacity: loading ? 0.5 : 1 }}
          ListEmptyComponent={<EmptyState title={tr("search.emptyTitle")} body={tr("search.emptyBody")} cta={tr("scan.suggest")} onPress={() => setSuggest(true)} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={t.gold} style={{ padding: 18 }} /> : null}
        />
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 14 }}>
          <Display size={24}>{tr("search.filtersTitle")}</Display>
          <TextAction label={tr("search.clearAll")} onPress={clearAll} />
        </View>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 18 }}>
          <View style={{ gap: 10 }}>
            <Mono size={10} ls={0.22}>ESTILO</Mono>
            <ChipWrap>
              {(facets?.style ?? []).map((o) => {
                const v = o.value as PiscoStyle; const on = state.style.includes(v);
                return <Chip key={o.value} label={STYLE_LABEL[v] ?? o.value} count={o.count} selected={on} disabled={!on && o.count === 0} onPress={() => setState((s) => ({ ...s, style: toggle(s.style, v) }))} />;
              })}
            </ChipWrap>
          </View>
          <View style={{ gap: 10 }}>
            <Mono size={10} ls={0.22}>VARIEDAD</Mono>
            <ChipWrap>
              {(facets?.variety ?? []).map((o) => {
                const on = state.variety.includes(o.value);
                return <Chip key={o.value} label={o.label ?? o.value} count={o.count} selected={on} disabled={!on && o.count === 0} onPress={() => setState((s) => ({ ...s, variety: toggle(s.variety, o.value) }))} />;
              })}
            </ChipWrap>
          </View>
          <View style={{ gap: 10 }}>
            <Mono size={10} ls={0.22}>D.O. / REGIÓN</Mono>
            <ChipWrap>
              {(facets?.region ?? []).map((o) => {
                const on = state.region.includes(o.value);
                return <Chip key={o.value} label={o.label ?? o.value} count={o.count} selected={on} disabled={!on && o.count === 0} onPress={() => setState((s) => ({ ...s, region: toggle(s.region, o.value) }))} />;
              })}
            </ChipWrap>
          </View>
          {abvBounds && abvValues ? (
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Mono size={10} ls={0.22}>ALC. VOL</Mono>
                <Mono size={10} ls={0.14} color={t.gold}>{`${num(abvValues[0], locale, 0)} – ${num(abvValues[1], locale, 0)} %`}</Mono>
              </View>
              <Slider
                label="ALC. VOL" min={Math.floor(abvBounds.min)} max={Math.ceil(abvBounds.max)} step={1} values={abvValues}
                onChange={setAbvDraft}
                onEnd={(v) => {
                  const lo = Math.floor(abvBounds.min), hi = Math.ceil(abvBounds.max);
                  setState((s) => ({ ...s, abvMin: v[0] > lo ? v[0] : undefined, abvMax: v[1] < hi ? v[1] : undefined }));
                  setAbvDraft(null);
                }}
              />
            </View>
          ) : null}
          <View style={{ gap: 10 }}>
            <Mono size={10} ls={0.22}>{tr("search.priceMax")}</Mono>
            <ChipWrap>
              {PRICE_STEPS.map((p) => <Chip key={p} label={`≤ S/ ${p}`} selected={state.priceMax === p} onPress={() => setState((s) => ({ ...s, priceMax: s.priceMax === p ? undefined : p }))} />)}
            </ChipWrap>
          </View>
          <View style={{ gap: 10 }}>
            <Mono size={10} ls={0.22}>{tr("search.ratingMin")}</Mono>
            <ChipWrap>
              {RATING_STEPS.map((r) => <Chip key={r} label={`${num(r, locale)}+`} selected={state.ratingMin === r} onPress={() => setState((s) => ({ ...s, ratingMin: s.ratingMin === r ? undefined : r }))} />)}
            </ChipWrap>
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <GoldButton label={total == null || loading ? tr("search.seeLoading") : tr("search.see", { n: total })} onPress={() => setSheet(false)} />
        </View>
      </Sheet>

      <OptionSheet open={sortOpen} onClose={() => setSortOpen(false)} title={tr("search.sortTitle")} selected={[state.sort]}
        options={SORTS.map((s) => ({ value: s.value, label: tr(s.key) }))} onSelect={(v) => setState((s) => ({ ...s, sort: v }))} />
      <SuggestSheet open={suggest} onClose={() => setSuggest(false)} initialName={text} />
    </View>
  );
}
