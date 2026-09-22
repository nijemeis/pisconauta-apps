import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, api } from "@/api/client";
import type { PiscoCard, PiscoStatus, Taxonomy } from "@/api/types";
import { Avatar } from "@/components/Avatar";
import { Crest } from "@/components/Crest";
import { SteppedBand } from "@/components/motifs";
import { Body, Display, EmptyState, ErrorState, Field, FieldError, GoldButton, Loading, Mono, OptionSheet, OutlineButton, PhotoBox, SectionHeader, SelectField } from "@/components/ui";
import { useT } from "@/i18n";
import { STATUS_LABEL, cardMeta } from "@/lib/format";
import { useFetch } from "@/lib/useFetch";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { toast } from "@/state/ui";
import { GUTTER, useTheme } from "@/theme";

function StatusBadge({ status }: { status: PiscoStatus }) {
  const t = useTheme();
  const locale = usePrefs((s) => s.locale);
  const colour = status === "published" ? t.gold : status === "in_review" ? t.ink2 : t.muted3;
  return (
    <View style={{ borderWidth: 1, borderColor: status === "published" ? t.gold : t.hair(0.2), paddingVertical: 3, paddingHorizontal: 7, alignSelf: "flex-start" }}>
      <Mono size={10} ls={0.16} color={colour}>{STATUS_LABEL[status][locale === "en" ? "en" : "es"]}</Mono>
    </View>
  );
}

/** Bodega claim: starts `pending`; an admin verifies it before bottles can go public. */
function ClaimForm({ onDone }: { onDone: () => void }) {
  const t = useTheme();
  const tr = useT();
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [form, setForm] = useState({ name: "", place: "", foundedYear: "", description: "", ruc: "", website: "" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  useEffect(() => { api.taxonomy().then(setTax).catch(() => {}); }, []);
  const set = (k: keyof typeof form) => (v: string) => { setForm((f) => ({ ...f, [k]: v })); setFields((f) => ({ ...f, [k]: "" })); };
  const places = (tax?.regions ?? []).flatMap((r) => r.valleys.map((v) => ({ value: `${r.slug}|${v}`, label: v, hint: `D.O. ${r.name}` })));
  const [regionSlug, valley] = form.place ? form.place.split("|") : [null, null];

  const submit = async () => {
    setBusy(true); setFields({}); setError(null);
    try {
      const website = form.website.trim();
      await api.claimProducer({
        name: form.name.trim(), regionSlug, valley,
        foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
        description: form.description.trim() || null, ruc: form.ruc.trim(),
        website: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
      });
      await useSession.getState().refresh();
      toast(tr("claim.sent"));
      onDone();
    } catch (e) {
      if (e instanceof ApiError) { setFields(e.fields ?? {}); setError(e.message); } else setError(tr("common.error"));
    } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 20, marginTop: 18 }}>
      <Body size={13} lh={1.6} color={t.ink3}>{tr("claim.body")}</Body>
      <Field label={tr("claim.name")} value={form.name} onChangeText={set("name")} error={fields.name} size={24} autoCapitalize="words" />
      <SelectField label="D.O. / VALLE" value={valley ? `${valley}` : null} placeholder={tr("common.choose")} onPress={() => setPlaceOpen(true)} error={fields.regionSlug ?? fields.valley} />
      <View style={{ flexDirection: "row", gap: 16 }}>
        <Field style={{ flex: 1 }} label={tr("claim.founded")} value={form.foundedYear} onChangeText={(v) => set("foundedYear")(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" error={fields.foundedYear} size={20} placeholder="1908" />
        <Field style={{ flex: 1.4 }} label="RUC" value={form.ruc} onChangeText={(v) => set("ruc")(v.replace(/\D/g, "").slice(0, 11))} keyboardType="number-pad" error={fields.ruc} size={20} placeholder="20XXXXXXXXX" />
      </View>
      <Field label={tr("claim.website")} plain value={form.website} onChangeText={set("website")} error={fields.website} autoCapitalize="none" keyboardType="url" autoCorrect={false} placeholder="https://" />
      <Field label={tr("claim.description")} plain multiline value={form.description} onChangeText={set("description")} error={fields.description} maxLength={600} />
      {error && !Object.values(fields).some(Boolean) ? <FieldError message={error} /> : null}
      <GoldButton label={tr("claim.submit")} onPress={submit} loading={busy} disabled={form.name.trim().length < 2} />
      <OptionSheet open={placeOpen} onClose={() => setPlaceOpen(false)} title="D.O. / Valle" options={places} selected={form.place ? [form.place] : []} onSelect={(v) => set("place")(v)} />
    </View>
  );
}

function BottleRow({ pisco }: { pisco: PiscoCard }) {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const locale = usePrefs((s) => s.locale);
  // The manage list carries cards only; a returned draft's reviewNote lives on the detail payload.
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (pisco.status !== "draft") return;
    let alive = true;
    api.pisco(pisco.id).then((d) => { if (alive) setNote(d.reviewNote); }).catch(() => {});
    return () => { alive = false; };
  }, [pisco.id, pisco.status]);

  return (
    <Pressable onPress={() => router.push(`/bottle/${pisco.id}`)} accessibilityRole="button" accessibilityLabel={pisco.name}
      style={{ flexDirection: "row", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.hair(0.08) }}>
      <PhotoBox src={pisco.photo} width={50} height={72} />
      <View style={{ flex: 1, gap: 5, justifyContent: "center" }}>
        <Display size={20} numberOfLines={2}>{pisco.name}</Display>
        <Mono size={10} ls={0.14} color={t.muted3}>{cardMeta(pisco, locale) || "—"}</Mono>
        <StatusBadge status={pisco.status} />
        {note ? (
          <View style={{ borderLeftWidth: 2, borderLeftColor: t.terracotta, paddingLeft: 10, marginTop: 4 }}>
            <Mono size={10} ls={0.16} color={t.terracotta}>{tr("producer.returned")}</Mono>
            <Body size={12} color={t.ink3}>{note}</Body>
          </View>
        ) : null}
      </View>
      <View style={{ justifyContent: "center" }}><Mono size={10} ls={0.16} color={t.gold}>{tr("producer.edit")}</Mono></View>
    </Pressable>
  );
}

export default function BodegaTab() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user);
  const memberships = useSession((s) => s.producers);
  const [index, setIndex] = useState(0);
  const membership = memberships[Math.min(index, memberships.length - 1)] ?? null;
  const { data: b, error, loading, reload } = useFetch(() => api.producer(membership!.id, true), [membership?.id], !!membership);

  // Returning from the wizard (or an admin verifying meanwhile) should show fresh state.
  useFocusEffect(useCallback(() => {
    if (!useSession.getState().user) return;
    useSession.getState().refresh();
    reload(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.id]));

  // Aficionados can register a bodega too — the API upgrades them to producer when they do.
  if (!user || user.role === "admin") {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 40, paddingHorizontal: GUTTER }}>
        <EmptyState title={tr("producer.onlyTitle")} body={tr("producer.onlyBody")} cta={user ? undefined : tr("onb.create")} onPress={() => router.push("/onboarding")} />
      </View>
    );
  }

  const order: PiscoStatus[] = ["draft", "in_review", "published", "archived"];
  const bottles = [...(b?.piscos ?? [])].filter((p) => p.status !== "archived").sort((x, y) => order.indexOf(x.status) - order.indexOf(y.status));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: GUTTER, paddingBottom: 32 }}
        refreshControl={membership ? <RefreshControl refreshing={loading && !!b} onRefresh={() => reload(true)} tintColor={t.gold} /> : undefined}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ gap: 2 }}>
            <Mono size={10} ls={0.22} color={t.gold}>{tr("producer.kicker")}</Mono>
            <Display size={34} accessibilityRole="header">{membership ? tr("producer.title") : tr("claim.title")}</Display>
          </View>
          <Avatar />
        </View>

        {!membership ? <ClaimForm onDone={() => setIndex(0)} /> : error && !b ? (
          <ErrorState message={error.message} retryLabel={tr("common.retry")} onRetry={() => reload()} />
        ) : !b ? <Loading /> : (
          <>
            <SteppedBand style={{ marginTop: 16 }} opacity={0.6} />
            <View style={{ flexDirection: "row", gap: 16, alignItems: "center", marginTop: 18 }}>
              <Crest initials={b.crestInitials} logo={b.logo} size={64} />
              <View style={{ flex: 1, gap: 3 }}>
                <Display size={26} numberOfLines={2}>{b.name}</Display>
                <Mono size={10} ls={0.18} color={b.status === "verified" ? t.gold : b.status === "rejected" ? t.terracotta : t.muted}>
                  {[b.valley ? `VALLE DE ${b.valley}` : b.region?.name, tr(b.status === "verified" ? "producer.verified" : b.status === "rejected" ? "producer.rejected" : "producer.pending")].filter(Boolean).join(" · ")}
                </Mono>
              </View>
            </View>

            {memberships.length > 1 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                {memberships.map((m, i) => <OutlineButton key={m.id} label={m.name} accent={i === index} pad={9} onPress={() => setIndex(i)} />)}
              </View>
            ) : null}

            {b.status !== "verified" ? (
              <View style={{ borderWidth: 1, borderColor: t.goldA(0.3), padding: 14, marginTop: 16, gap: 4 }}>
                <Mono size={10} ls={0.2} color={t.gold}>{tr(b.status === "rejected" ? "producer.rejected" : "producer.pending")}</Mono>
                <Body size={12} color={t.ink3}>{tr(b.status === "rejected" ? "producer.rejectedBody" : "producer.pendingBody")}</Body>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <GoldButton label={tr("producer.new")} style={{ flex: 1.3 }} pad={14} onPress={() => router.push(`/bottle/new?producerId=${b.id}`)} />
              <OutlineButton label={tr("producer.public")} style={{ flex: 1 }} pad={14} disabled={!b.verified} onPress={() => router.push(`/producer/${b.slug}`)} />
            </View>

            <View style={{ marginTop: 26, marginBottom: 4 }}><SectionHeader label={`${tr("producer.bottles")} · ${bottles.length}`} /></View>
            {bottles.length ? bottles.map((p) => <BottleRow key={p.id} pisco={p} />) : (
              <EmptyState title={tr("producer.emptyTitle")} body={tr("producer.emptyBody")} />
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
