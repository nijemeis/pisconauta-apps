import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bottomPad } from "@/lib/insets";
import { ApiError, api } from "@/api/client";
import type { AwardLevel, PiscoStatus, PiscoStyle, StillType, Taxonomy } from "@/api/types";
import { Body, Chip, ChipWrap, Display, ErrorState, Field, FieldError, GoldButton, Loading, Mono, OptionSheet, OutlineButton, PhotoBox, SectionHeader, Segmented, SelectField, Slider, TextAction } from "@/components/ui";
import { useT } from "@/i18n";
import { AWARD_LABEL, AXES, AXIS_LABEL, STATUS_LABEL, STILL_LABEL, STYLE_LABEL, num } from "@/lib/format";
import { emptyForm, fromDetail, stepForField, toInput, type AwardDraft, type BottleForm, type PhotoSlot, type SlotKind } from "@/features/bottle/form";
import { usePrefs } from "@/state/prefs";
import { toast, toastError } from "@/state/ui";
import { GUTTER, useTheme } from "@/theme";

const AUTOSAVE_MS = 5000;
const SIZES = [50, 200, 375, 500, 700, 750, 1000];
const LEVELS: AwardLevel[] = ["gran_oro", "oro", "plata", "bronce"];
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type Picker = null | "size" | "variety" | "place" | "notes" | "photo-bottle" | "photo-label" | "award-level";

function UploadSlot({ label, a11y, required, slot, onPress, onClear }: { label: string; a11y?: string; required?: boolean; slot?: PhotoSlot; onPress: () => void; onClear: () => void }) {
  const t = useTheme();
  const tr = useT();
  const src = slot?.localUri ?? slot?.url;
  const uploading = slot?.progress != null;
  return (
    <View style={{ width: 96 }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label}
        style={{ width: 96, height: 132, borderWidth: 1, borderStyle: src ? "solid" : "dashed", borderColor: slot?.error ? t.error : required || src ? t.gold : t.hair(0.25), alignItems: "center", justifyContent: "center", gap: 8 }}>
        {src ? <PhotoBox src={src} width={94} height={130} /> : (
          <>
            <Display size={24} color={required ? t.gold : t.ink4}>+</Display>
            <Mono size={10} ls={0.18} center color={required ? t.gold : t.muted2}>{label}</Mono>
          </>
        )}
        {uploading ? (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, backgroundColor: "rgba(20,16,14,0.6)", justifyContent: "flex-end" }} accessibilityLiveRegion="polite">
            <Mono size={10} ls={0.1} center color="#F4ECDE" style={{ marginBottom: 6 }}>{`${Math.round((slot?.progress ?? 0) * 100)} %`}</Mono>
            <View style={{ height: 3, backgroundColor: "rgba(244,236,222,0.2)" }}><View style={{ height: 3, width: `${Math.round((slot?.progress ?? 0) * 100)}%`, backgroundColor: t.gold }} /></View>
          </View>
        ) : null}
      </Pressable>
      {src && !uploading ? <Pressable onPress={onClear} hitSlop={8} style={{ marginTop: 6 }} accessibilityRole="button"><Mono size={10} ls={0.16} color={t.muted3} center>{`✕ ${tr("cellar.remove")}`}</Mono></Pressable> : null}
      <FieldError message={slot?.error} />
    </View>
  );
}

export default function BottleWizard() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = usePrefs((s) => s.locale);
  const params = useLocalSearchParams<{ id: string; producerId?: string }>();
  const isNew = params.id === "new";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<BottleForm>(emptyForm);
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [status, setStatus] = useState<PiscoStatus>("draft");
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(isNew);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [award, setAward] = useState<AwardDraft>({ competition: "", level: "oro", year: "" });

  // Mutable mirrors so the debounced/serialised saver always sees the latest state.
  const idRef = useRef<string | null>(isNew ? null : params.id);
  const formRef = useRef(form);
  formRef.current = form;
  const dirty = useRef(false);
  const photosDirty = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; if (timer.current) clearTimeout(timer.current); }, []);

  const load = useCallback(() => {
    api.taxonomy().then(setTax).catch(() => {});
    if (isNew) return;
    setLoadError(null);
    api.pisco(params.id).then((p) => { setForm(fromDetail(p)); setStatus(p.status); setReviewNote(p.reviewNote); setReady(true); })
      .catch((e: Error) => setLoadError(e.message));
  }, [isNew, params.id]);
  useEffect(load, [load]);

  /** Create on first save, PATCH afterwards. Saves are serialised; returns false when the server refused. */
  const save = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (inFlight.current) await inFlight.current;
    if (!dirty.current && idRef.current) return true;
    const run = (async () => {
      dirty.current = false;
      const includePhotos = photosDirty.current;
      photosDirty.current = false;
      if (alive.current) setSaveState("saving");
      try {
        const body = toInput(formRef.current, { includePhotos, producerId: idRef.current ? undefined : params.producerId });
        const out = idRef.current ? await api.patchPisco(idRef.current, body) : await api.createPisco(body);
        idRef.current = out.id;
        if (alive.current) { setStatus(out.status); setSaveState(dirty.current ? "dirty" : "saved"); setSavedAt(new Date()); setBanner(null); }
        return true;
      } catch (e) {
        dirty.current = true;
        if (includePhotos) photosDirty.current = true;
        if (alive.current) {
          setSaveState("error");
          if (e instanceof ApiError) { if (e.fields) setFields((f) => ({ ...f, ...e.fields })); setBanner(e.message); }
          else setBanner(tr("common.error"));
        }
        return false;
      }
    })();
    inFlight.current = run;
    const ok = await run;
    if (inFlight.current === run) inFlight.current = null;
    return ok;
  }, [params.producerId, tr]);

  const touch = useCallback((photos = false) => {
    dirty.current = true;
    if (photos) photosDirty.current = true;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { save(); }, AUTOSAVE_MS);
  }, [save]);

  const patch = (p: Partial<BottleForm>, clear: string[] = []) => {
    setForm((f) => ({ ...f, ...p }));
    if (clear.length) setFields((f) => { const n = { ...f }; clear.forEach((k) => delete n[k]); return n; });
    touch();
  };

  const setSlot = (kind: SlotKind, slot: PhotoSlot | undefined) => setForm((f) => ({ ...f, photos: { ...f.photos, [kind]: slot } }));

  const pickPhoto = async (kind: SlotKind, source: "library" | "camera") => {
    try {
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { toast(tr("wizard.cameraDenied")); return; }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [3, 4] };
      const r = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets[0]) return;
      const asset = r.assets[0];
      const previous = formRef.current.photos[kind];
      setSlot(kind, { localUri: asset.uri, progress: 0 });
      setFields((f) => { const n = { ...f }; delete n.photos; return n; });
      try {
        const up = await api.upload({ uri: asset.uri, name: asset.fileName ?? `${kind}.jpg`, type: asset.mimeType ?? "image/jpeg" }, "pisco", (progress) => setSlot(kind, { localUri: asset.uri, progress }));
        setSlot(kind, { localUri: asset.uri, url: up.url, key: up.key, width: up.width, height: up.height, phash: up.phash, progress: null });
        touch(true);
      } catch (e) {
        setSlot(kind, { ...(previous ?? {}), progress: null, error: e instanceof Error ? e.message : tr("common.error") });
      }
    } catch (e) { toastError(e); }
  };

  const hasContent = () => { const f = formRef.current; return !!(f.name.trim() || f.style || f.varieties.length || f.photos.bottle?.key || f.abv || f.description.trim()); };

  const cancel = async () => {
    // Drafts save anything: leaving keeps the work unless nothing was entered.
    if (dirty.current && (idRef.current || hasContent())) await save();
    router.back();
  };

  const saveDraft = async () => {
    dirty.current = dirty.current || !idRef.current;
    if (await save()) toast(tr("wizard.draftSaved"));
  };

  const submit = async () => {
    setPublishing(true); setBanner(null);
    try {
      dirty.current = dirty.current || !idRef.current;
      if (!(await save()) || !idRef.current) return;
      const out = await api.publishPisco(idRef.current);
      setStatus(out.status);
      toast(tr("wizard.sent"));
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        setBanner(e.message);
        if (e.fields) {
          setFields(e.fields);
          const first = Object.keys(e.fields).map(stepForField).sort()[0];
          if (first) setStep(first);
        }
      } else setBanner(tr("common.error"));
    } finally { setPublishing(false); }
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 40 }}>
        {loadError ? <ErrorState message={loadError} retryLabel={tr("common.retry")} onRetry={load} /> : <Loading />}
        <View style={{ alignItems: "center" }}><TextAction label={tr("common.close")} onPress={() => router.back()} /></View>
      </View>
    );
  }

  const varietyName = (slug: string) => tax?.varieties.find((v) => v.slug === slug)?.name ?? slug;
  const placeLabel = form.place ? form.place.split("|")[1] || tax?.regions.find((r) => r.slug === form.place!.split("|")[0])?.name || "" : null;
  const places = (tax?.regions ?? []).flatMap((r) => r.valleys.map((v) => ({ value: `${r.slug}|${v}`, label: v, hint: `D.O. ${r.name}` })));
  const stepErrors = (n: 1 | 2 | 3) => Object.keys(fields).filter((k) => fields[k] && stepForField(k) === n).length;
  const saveLabel = saveState === "saving" ? tr("wizard.saving") : saveState === "dirty" ? tr("wizard.unsaved") : saveState === "error" ? tr("wizard.notSaved")
    : savedAt ? `${tr("wizard.savedAt")} ${savedAt.getHours().toString().padStart(2, "0")}:${savedAt.getMinutes().toString().padStart(2, "0")}` : STATUS_LABEL[status][locale === "en" ? "en" : "es"];
  const next = step === 1 ? tr("wizard.next1") : step === 2 ? tr("wizard.next2") : tr(status === "draft" ? "wizard.submit" : "wizard.resubmit");

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: Platform.OS === "ios" ? 18 : insets.top + 12, paddingBottom: 12, paddingHorizontal: GUTTER, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: t.hair(0.08) }}>
        <View style={{ width: 84 }}><TextAction label={step === 1 ? tr("common.cancel") : tr("wizard.back")} color={t.ink2} onPress={() => (step === 1 ? cancel() : setStep((step - 1) as 1 | 2))} /></View>
        <Display size={22} accessibilityRole="header">{isNew ? tr("wizard.titleNew") : tr("wizard.titleEdit")}</Display>
        <View style={{ width: 84, alignItems: "flex-end" }}><Mono size={10} ls={0.18} color={t.gold}>{`PASO ${step}/3`}</Mono></View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: GUTTER, gap: 22, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Mono size={10} ls={0.2} color={t.muted3}>{step === 1 ? tr("wizard.step1") : step === 2 ? tr("wizard.step2") : tr("wizard.step3")}</Mono>
          <Mono size={10} ls={0.16} color={saveState === "error" ? t.error : t.muted3} accessibilityLiveRegion="polite">{saveLabel}</Mono>
        </View>

        {reviewNote && status === "draft" ? (
          <View style={{ borderLeftWidth: 2, borderLeftColor: t.terracotta, paddingLeft: 12, gap: 2 }}>
            <Mono size={10} ls={0.18} color={t.terracotta}>{tr("producer.returned")}</Mono>
            <Body size={12} color={t.ink3}>{reviewNote}</Body>
          </View>
        ) : null}
        {banner ? <Body size={12} color={t.error} accessibilityLiveRegion="assertive">{banner}</Body> : null}

        {step === 1 ? (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <UploadSlot label={"FOTO\nBOTELLA"} a11y="Foto botella" required slot={form.photos.bottle} onPress={() => setPicker("photo-bottle")} onClear={() => { setSlot("bottle", undefined); touch(true); }} />
              <UploadSlot label="ETIQUETA" slot={form.photos.label} onPress={() => setPicker("photo-label")} onClear={() => { setSlot("label", undefined); touch(true); }} />
              <View style={{ flex: 1, borderWidth: 1, borderColor: t.hair(0.12), padding: 12, gap: 6, height: 132 }}>
                <Mono size={10} ls={0.2} color={t.gold}>CONSEJO</Mono>
                <Body size={12} lh={1.45} color={t.ink3}>{tr("wizard.photoTip")}</Body>
              </View>
            </View>
            <FieldError message={fields.photos} />
            <Field label="NOMBRE DE LA BOTELLA" size={24} value={form.name} onChangeText={(v) => patch({ name: v }, ["name"])} error={fields.name} placeholder="Quebranta Puro" autoCapitalize="words" maxLength={120} />
            <Body size={12} color={t.ink4}>{tr("wizard.draftHint")}</Body>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Field style={{ flex: 1 }} label="ALC. VOL %" size={20} value={form.abv} onChangeText={(v) => patch({ abv: v.replace(/[^\d.,]/g, "").slice(0, 5) }, ["abvPct"])} keyboardType="decimal-pad" placeholder="42,8" error={fields.abvPct} />
              <SelectField style={{ flex: 1 }} label="TAMAÑO" value={form.bottleSizeMl ? `${form.bottleSizeMl} ml` : null} placeholder="700 ml" onPress={() => setPicker("size")} error={fields.bottleSizeMl} />
              <Field style={{ flex: 1 }} label="COSECHA" size={20} value={form.vintage} onChangeText={(v) => patch({ vintage: v.replace(/\D/g, "").slice(0, 4) }, ["vintage"])} keyboardType="number-pad" placeholder="2024" error={fields.vintage} />
            </View>
            <View style={{ gap: 10 }}>
              <Mono size={10} ls={0.2} color={t.muted2}>ESTILO</Mono>
              <Segmented<PiscoStyle> value={form.style} options={(Object.keys(STYLE_LABEL) as PiscoStyle[]).map((v) => ({ value: v, label: STYLE_LABEL[v] }))}
                onChange={(v) => patch({ style: v, varieties: v === "puro" ? form.varieties.slice(0, 1) : form.varieties }, ["style", "varieties"])} />
              <FieldError message={fields.style} />
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <SelectField style={{ flex: 1 }} label="VARIEDAD" value={form.varieties.length ? form.varieties.map(varietyName).join(" + ") : null} placeholder={tr("common.choose")} onPress={() => setPicker("variety")} error={fields.varieties} />
              <SelectField style={{ flex: 1 }} label="D.O. / VALLE" value={placeLabel} placeholder={tr("common.choose")} onPress={() => setPicker("place")} error={fields.regionSlug ?? fields.valley} />
            </View>
            <View style={{ gap: 10 }}>
              <Mono size={10} ls={0.2} color={t.muted2}>{`NOTAS DE CATA · ${tr("wizard.tapToAdd")}`}</Mono>
              <ChipWrap>
                {form.noteIds.map((id) => {
                  const term = tax?.noteTerms.find((n) => n.id === id);
                  return <Chip key={id} selected label={term ? (locale === "en" ? term.en : term.es) : "…"} onRemove={() => patch({ noteIds: form.noteIds.filter((x) => x !== id) })} />;
                })}
                <Chip dashed label="+ nota" onPress={() => setPicker("notes")} />
              </ChipWrap>
              <FieldError message={fields.noteIds} />
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Field style={{ flex: 1 }} label={tr("wizard.rest")} size={20} value={form.restMonths} onChangeText={(v) => patch({ restMonths: v.replace(/\D/g, "").slice(0, 3) }, ["restMonths"])} keyboardType="number-pad" placeholder="12" error={fields.restMonths} />
              <Field style={{ flex: 1 }} label={tr("wizard.price")} size={20} value={form.priceSoles} onChangeText={(v) => patch({ priceSoles: v.replace(/[^\d.,]/g, "").slice(0, 8) }, ["priceSoles"])} keyboardType="decimal-pad" placeholder="89" error={fields.priceSoles} />
            </View>
            <View style={{ gap: 10 }}>
              <Mono size={10} ls={0.2} color={t.muted2}>ALAMBIQUE</Mono>
              <Segmented<StillType> value={form.stillType} options={(Object.keys(STILL_LABEL) as StillType[]).map((v) => ({ value: v, label: v === "alambique_cobre" ? "Cobre" : STILL_LABEL[v] }))} onChange={(v) => patch({ stillType: v }, ["stillType"])} />
              <FieldError message={fields.stillType} />
            </View>
            <View style={{ gap: 10 }}>
              <Mono size={10} ls={0.2} color={t.muted2}>DESTILACIONES</Mono>
              <Segmented<string> value={form.distillations ? String(form.distillations) : null} options={["1", "2", "3"].map((v) => ({ value: v, label: `${v}×` }))} onChange={(v) => patch({ distillations: Number(v) }, ["distillations"])} />
              <FieldError message={fields.distillations} />
            </View>
            <Field label={tr("wizard.description")} plain multiline value={form.description} onChangeText={(v) => patch({ description: v }, ["description"])} error={fields.description} maxLength={2000} />

            <View style={{ gap: 14 }}>
              <SectionHeader label="PERFIL DE SABOR" gloss="0–5" />
              {AXES.map((axis) => (
                <View key={axis}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Mono size={10} ls={0.2} color={t.muted2}>{AXIS_LABEL[axis]}</Mono>
                    <Mono size={10} ls={0.1} color={form.flavours[axis] == null ? t.muted3 : t.gold}>{form.flavours[axis] == null ? "—" : num(form.flavours[axis]!, locale)}</Mono>
                  </View>
                  <Slider label={AXIS_LABEL[axis]} min={0} max={5} step={0.5} values={[form.flavours[axis] ?? 0]} color={axis === "dulzor" ? t.terracotta : undefined}
                    onChange={(v) => patch({ flavours: { ...form.flavours, [axis]: v[0] } })} />
                </View>
              ))}
            </View>

            <View style={{ gap: 12 }}>
              <SectionHeader label="PREMIOS" gloss="AWARDS" />
              {form.awards.map((a, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: t.goldA(0.3), padding: 12, gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Display size={19}>{AWARD_LABEL[a.level][locale === "en" ? "en" : "es"]}</Display>
                    <Body size={12} color={t.ink4}>{`${a.competition} · ${a.year}`}</Body>
                    <FieldError message={fields[`awards.${i}.competition`] ?? fields[`awards.${i}.year`]} />
                  </View>
                  <TextAction label="✕" color={t.muted3} onPress={() => patch({ awards: form.awards.filter((_, j) => j !== i) })} />
                </View>
              ))}
              <Field label={tr("wizard.awardCompetition")} size={20} value={award.competition} onChangeText={(v) => setAward((a) => ({ ...a, competition: v }))} placeholder="Concurso Nacional del Pisco" />
              <View style={{ flexDirection: "row", gap: 16 }}>
                <SelectField style={{ flex: 1.4 }} label={tr("wizard.awardLevel")} size={18} value={AWARD_LABEL[award.level][locale === "en" ? "en" : "es"]} onPress={() => setPicker("award-level")} />
                <Field style={{ flex: 1 }} label={tr("wizard.awardYear")} size={20} value={award.year} onChangeText={(v) => setAward((a) => ({ ...a, year: v.replace(/\D/g, "").slice(0, 4) }))} keyboardType="number-pad" placeholder="2025" />
              </View>
              <OutlineButton label={tr("wizard.awardAdd")} pad={12} disabled={award.competition.trim().length < 2 || award.year.length !== 4}
                onPress={() => { patch({ awards: [...form.awards, { ...award, competition: award.competition.trim() }] }); setAward({ competition: "", level: "oro", year: "" }); }} />
            </View>
          </>
        ) : null}

        {([1, 2, 3] as const).filter((n) => n !== step && stepErrors(n) > 0).map((n) => (
          <Pressable key={n} onPress={() => setStep(n)} accessibilityRole="button">
            <Body size={12} color={t.error}>{tr("wizard.errorsInStep", { n })}</Body>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: bottomPad(insets.bottom, 14), backgroundColor: t.bar, borderTopWidth: 1, borderTopColor: t.hair(0.08) }}>
        <OutlineButton label={tr("wizard.draft")} onPress={saveDraft} loading={saveState === "saving" && !publishing} style={{ width: 118 }} />
        <GoldButton label={next} style={{ flex: 1 }} loading={publishing} onPress={() => (step === 3 ? submit() : setStep((step + 1) as 2 | 3))} />
      </View>

      <OptionSheet open={picker === "size"} onClose={() => setPicker(null)} title="Tamaño" selected={form.bottleSizeMl ? [form.bottleSizeMl] : []}
        options={SIZES.map((s) => ({ value: s, label: `${s} ml` }))} onSelect={(v) => patch({ bottleSizeMl: v }, ["bottleSizeMl"])} />
      <OptionSheet open={picker === "variety"} onClose={() => setPicker(null)} title="Variedad" multi={form.style !== "puro"} doneLabel={tr("common.done")} selected={form.varieties}
        options={(tax?.varieties ?? []).map((v) => ({ value: v.slug, label: v.name, hint: v.aromatic ? "AROMÁTICA" : "NO AROMÁTICA" }))}
        onSelect={(v) => patch({ varieties: form.style === "puro" ? [v] : form.varieties.includes(v) ? form.varieties.filter((x) => x !== v) : [...form.varieties, v].slice(0, 8) }, ["varieties"])} />
      <OptionSheet open={picker === "place"} onClose={() => setPicker(null)} title="D.O. / Valle" selected={form.place ? [form.place] : []} options={places} onSelect={(v) => patch({ place: v }, ["regionSlug", "valley"])} />
      <OptionSheet open={picker === "notes"} onClose={() => setPicker(null)} title="Notas de cata" multi doneLabel={tr("common.done")} selected={form.noteIds}
        options={(tax?.noteTerms ?? []).map((n) => ({ value: n.id, label: locale === "en" ? n.en : n.es, hint: n.family }))}
        onSelect={(v) => patch({ noteIds: form.noteIds.includes(v) ? form.noteIds.filter((x) => x !== v) : [...form.noteIds, v].slice(0, 12) }, ["noteIds"])} />
      <OptionSheet open={picker === "award-level"} onClose={() => setPicker(null)} title={tr("wizard.awardLevel")} selected={[award.level]}
        options={LEVELS.map((l) => ({ value: l, label: AWARD_LABEL[l][locale === "en" ? "en" : "es"] }))} onSelect={(v) => setAward((a) => ({ ...a, level: v }))} />
      <OptionSheet open={picker === "photo-bottle" || picker === "photo-label"} onClose={() => setPicker(null)} title={picker === "photo-label" ? "Etiqueta" : "Foto botella"} selected={[]}
        options={[{ value: "library", label: tr("wizard.fromLibrary") }, { value: "camera", label: tr("wizard.fromCamera") }]}
        onSelect={(v) => { const kind: SlotKind = picker === "photo-label" ? "label" : "bottle"; setTimeout(() => pickPhoto(kind, v as "library" | "camera"), 350); }} />
    </KeyboardAvoidingView>
  );
}
