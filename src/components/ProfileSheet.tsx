import { useRouter } from "expo-router";
import { Alert, Linking, Pressable, View } from "react-native";
import { API_URL, api } from "@/api/client";
import type { Currency } from "@/api/types";
import { Body, Display, GoldButton, Mono, OutlineButton, Segmented, Sheet } from "@/components/ui";
import { useT } from "@/i18n";
import { usePrefs, type Locale } from "@/state/prefs";
import { useSession } from "@/state/session";
import { useUi } from "@/state/ui";
import { useTheme, type ThemeName } from "@/theme";

/** Profile / settings, opened from the avatar: theme, language, session. */
export function ProfileSheet() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const open = useUi((s) => s.profileOpen);
  const setOpen = useUi((s) => s.setProfileOpen);
  const user = useSession((s) => s.user);
  const theme = usePrefs((s) => s.theme);
  const locale = usePrefs((s) => s.locale);
  const currency = usePrefs((s) => s.currency);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onClose={close}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 20 }}>
        <View style={{ gap: 4 }}>
          <Mono size={10} ls={0.22} color={t.gold}>{tr("profile.kicker")}</Mono>
          <Display size={28}>{user ? user.displayName : tr("profile.guest")}</Display>
          {user ? <Body size={12} color={t.ink4}>{`${user.email} · ${user.role === "producer" ? "Productor" : user.role === "admin" ? "Admin" : "Aficionado"}`}</Body>
            : <Body size={12} color={t.ink4}>{tr("profile.guestBody")}</Body>}
        </View>

        <View style={{ gap: 8 }}>
          <Mono size={10} ls={0.2}>{tr("profile.theme")}</Mono>
          <Segmented<ThemeName>
            value={theme}
            onChange={(v) => useSession.getState().setTheme(v)}
            options={[{ value: "dark", label: "Casa de Oro" }, { value: "light", label: "Valle Claro" }]}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Mono size={10} ls={0.2}>{tr("profile.language")}</Mono>
          <Segmented<Locale>
            value={locale}
            onChange={(v) => useSession.getState().setLocale(v)}
            options={[{ value: "es-PE", label: "Español (Perú)" }, { value: "en", label: "English" }]}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Mono size={10} ls={0.2}>{tr("profile.currency")}</Mono>
          <Segmented<Currency>
            value={currency}
            onChange={(v) => useSession.getState().setCurrency(v)}
            options={[{ value: "PEN", label: "S/ PEN" }, { value: "USD", label: "US$ USD" }, { value: "EUR", label: "€ EUR" }]}
          />
        </View>

        {/* Legal pages and the contact form live on the website. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
          {([["/contacto", "Contacto"], ["/privacidad", "Privacidad"], ["/terminos", "Términos"]] as const).map(([path, label]) => (
            <Pressable key={path} onPress={() => Linking.openURL(`${API_URL}${path}`)} hitSlop={8}>
              <Mono size={10} ls={0.18} color={t.gold}>{label}</Mono>
            </Pressable>
          ))}
          {user && user.role !== "admin" ? (
            <Pressable hitSlop={8} onPress={() => Alert.alert("Eliminar mi cuenta", "Se borrarán tu perfil, tu cava y tus reseñas. No se puede deshacer.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Eliminar", style: "destructive", onPress: async () => {
                try { await api.deleteMe(); close(); await useSession.getState().signOut(); router.replace("/onboarding"); }
                catch (e) { Alert.alert("No se pudo eliminar", (e as Error).message); }
              } },
            ])}>
              <Mono size={10} ls={0.18} color={t.terracotta}>Eliminar cuenta</Mono>
            </Pressable>
          ) : null}
        </View>

        {user ? (
          <OutlineButton label={tr("profile.logout")} onPress={async () => { close(); await useSession.getState().signOut(); router.replace("/onboarding"); }} />
        ) : (
          <GoldButton label={tr("profile.signin")} onPress={() => { close(); router.push("/onboarding"); }} />
        )}
      </View>
    </Sheet>
  );
}
