import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { screenBottom } from "@/lib/insets";
import { ApiError, api } from "@/api/client";
import { Chakana, SteppedBand } from "@/components/motifs";
import { Body, Display, Field, FieldError, GoldButton, Mono, OutlineButton, TextAction } from "@/components/ui";
import { useT } from "@/i18n";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { toast } from "@/state/ui";
import { fonts, useTheme } from "@/theme";

type Role = "enthusiast" | "producer";
type Mode = "welcome" | "signup" | "login";

function RoleCard({ title, helper, selected, onPress }: { title: string; helper: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}
      style={{ padding: 18, borderWidth: 1, borderColor: selected ? t.gold : t.hair(0.16), backgroundColor: selected ? t.goldA(0.09) : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ gap: 4, flexShrink: 1 }}>
        <Display size={24}>{title}</Display>
        <Body size={12} color={t.ink4}>{helper}</Body>
      </View>
      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: selected ? t.gold : t.hair(0.32), backgroundColor: selected ? t.gold : "transparent" }} />
    </Pressable>
  );
}

export default function Onboarding() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = usePrefs((s) => s.locale);
  const [mode, setMode] = useState<Mode>("welcome");
  const [role, setRole] = useState<Role>("enthusiast");
  const [form, setForm] = useState({ displayName: "", email: "", password: "", birthYear: "" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => { setForm((f) => ({ ...f, [k]: v })); setFields((f) => ({ ...f, [k]: "" })); setFormError(null); };

  const leave = (asProducer: boolean) => {
    if (asProducer) router.replace("/bodega");
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const submit = async () => {
    setBusy(true); setFields({}); setFormError(null);
    try {
      const email = form.email.trim();
      if (mode === "login") {
        const r = await api.login({ email, password: form.password });
        await useSession.getState().signIn(r);
        leave(false);
      } else {
        const year = form.birthYear.trim() ? Number(form.birthYear) : undefined;
        if (year !== undefined && !Number.isInteger(year)) { setFields({ birthYear: tr("onb.birthYearInvalid") }); return; }
        const r = await api.signup({ email, password: form.password, displayName: form.displayName.trim(), role, birthYear: year, locale });
        await useSession.getState().signIn(r);
        // Producers continue into the bodega claim flow; aficionados land on Descubre.
        leave(role === "producer");
      }
    } catch (e) {
      if (e instanceof ApiError) { setFields(e.fields ?? {}); setFormError(e.message); }
      else setFormError(tr("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const soon = () => toast(tr("common.soon"));
  // Many Android phones have a shorter logical viewport than the 874pt design; tighten the rhythm so
  // the whole welcome screen (down to "explorar sin cuenta") fits without scrolling.
  const compact = useWindowDimensions().height < 860;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + (compact ? 14 : 44), paddingHorizontal: 28, paddingBottom: screenBottom(insets.bottom, 28) }}>
        <SteppedBand />
        <View style={{ alignItems: "center", marginTop: compact ? 14 : 26 }}>
          <Chakana size={compact ? 46 : 56} />
          <Display size={46} center style={{ letterSpacing: 46 * 0.06, marginTop: compact ? 10 : 18, fontFamily: fonts.display }} accessibilityRole="header">PISCONAUTA</Display>
          <Display size={22} italic center color={t.gold} style={{ marginTop: 4 }}>{tr("onb.subtitle")}</Display>
        </View>

        {mode === "welcome" ? (
          <>
            <Body size={13} lh={1.6} color={t.ink3} style={{ marginTop: compact ? 14 : 22 }}>{tr("onb.body")}</Body>
            <Mono size={10} ls={0.22} color={t.muted2} style={{ marginTop: compact ? 18 : 28, marginBottom: 12 }}>ENTRO COMO / I JOIN AS</Mono>
            <View style={{ gap: 10 }} accessibilityRole="radiogroup">
              <RoleCard title="Aficionado" helper={tr("onb.roleFan")} selected={role === "enthusiast"} onPress={() => setRole("enthusiast")} />
              <RoleCard title="Productor" helper={tr("onb.roleProducer")} selected={role === "producer"} onPress={() => setRole("producer")} />
            </View>
            <View style={{ flex: 1, minHeight: compact ? 18 : 28 }} />
            <GoldButton label={tr("onb.create")} onPress={() => setMode("signup")} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <OutlineButton label="Apple" mono={false} onPress={soon} style={{ flex: 1 }} pad={12} />
              <OutlineButton label="Google" mono={false} onPress={soon} style={{ flex: 1 }} pad={12} />
              <OutlineButton label={tr("onb.email")} mono={false} onPress={() => setMode("signup")} style={{ flex: 1 }} pad={12} />
            </View>
            <Pressable onPress={() => setMode("login")} hitSlop={10} style={{ marginTop: 18 }} accessibilityRole="button">
              <Body size={12} center color={t.ink4}>{tr("onb.haveAccount")} · <Body size={12} color={t.gold}>{tr("onb.login")}</Body></Body>
            </Pressable>
            <Pressable onPress={() => leave(false)} hitSlop={10} style={{ marginTop: 22 }} accessibilityRole="button">
              <Mono size={10} ls={0.2} center color={t.muted3}>{tr("onb.guest")}</Mono>
            </Pressable>
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 30 }}>
              <Mono size={10} ls={0.22} color={t.gold}>
                {mode === "login" ? tr("onb.loginKicker") : `${tr("onb.signupKicker")} · ${role === "producer" ? "PRODUCTOR" : "AFICIONADO"}`}
              </Mono>
              <TextAction label={tr("common.back")} onPress={() => { setMode("welcome"); setFields({}); setFormError(null); }} color={t.muted3} />
            </View>
            <View style={{ gap: 20, marginTop: 20 }}>
              {mode === "signup" ? (
                <Field label={tr("onb.name")} value={form.displayName} onChangeText={set("displayName")} error={fields.displayName} autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" />
              ) : null}
              <Field label={tr("onb.emailLabel")} plain value={form.email} onChangeText={set("email")} error={fields.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
              <Field label={tr("onb.password")} plain value={form.password} onChangeText={set("password")} error={fields.password} secureTextEntry autoCapitalize="none"
                autoComplete={mode === "login" ? "current-password" : "new-password"} textContentType={mode === "login" ? "password" : "newPassword"} />
              {mode === "signup" ? (
                <Field label={tr("onb.birthYear")} value={form.birthYear} onChangeText={(v) => set("birthYear")(v.replace(/\D/g, "").slice(0, 4))} error={fields.birthYear} keyboardType="number-pad" placeholder="1990" />
              ) : null}
            </View>
            {formError && !Object.values(fields).some(Boolean) ? <FieldError message={formError} /> : null}
            {mode === "signup" && role === "producer" ? <Body size={12} color={t.ink4} style={{ marginTop: 16 }}>{tr("onb.producerNote")}</Body> : null}
            <View style={{ flex: 1, minHeight: 28 }} />
            <GoldButton label={mode === "login" ? tr("onb.loginCta") : tr("onb.create")} onPress={submit} loading={busy}
              disabled={!form.email || !form.password || (mode === "signup" && !form.displayName)} />
            <Pressable onPress={() => { setMode(mode === "login" ? "signup" : "login"); setFields({}); setFormError(null); }} hitSlop={10} style={{ marginTop: 18 }} accessibilityRole="button">
              <Body size={12} center color={t.ink4}>
                {mode === "login" ? tr("onb.noAccount") : tr("onb.haveAccount")} · <Body size={12} color={t.gold}>{mode === "login" ? tr("onb.createShort") : tr("onb.login")}</Body>
              </Body>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
