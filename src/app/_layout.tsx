import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AgeGate } from "@/components/AgeGate";
import { ProfileSheet } from "@/components/ProfileSheet";
import { Splash } from "@/components/Splash";
import { Toast } from "@/components/ui";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme";
import { fontMap } from "@/theme/fonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_HOLD_MS = 3000;

export default function RootLayout() {
  const t = useTheme();
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts(fontMap);
  const hydrated = usePrefs((s) => s.hydrated);
  const ageOk = usePrefs((s) => s.ageOk);
  const ready = useSession((s) => s.ready);
  const [held, setHeld] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const routed = useRef(false);
  const deepLinked = useRef(false);

  useEffect(() => {
    // Rates load after hydration so a failed fetch never overwrites the cached value with nothing.
    usePrefs.getState().hydrate().then(() => usePrefs.getState().loadRates());
    useSession.getState().bootstrap();
    Linking.getInitialURL()
      .then((url) => { const path = url ? Linking.parse(url).path : null; deepLinked.current = !!path && path !== "/"; })
      .catch(() => {});
  }, []);

  // The hold starts once the splash is actually visible (after the age gate on first launch).
  useEffect(() => {
    if (!hydrated || !ageOk) return;
    const timer = setTimeout(() => setHeld(true), SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, [hydrated, ageOk]);

  const fontsDone = fontsLoaded || !!fontError;
  useEffect(() => { if (fontsDone && hydrated) SplashScreen.hideAsync().catch(() => {}); }, [fontsDone, hydrated]);
  useEffect(() => { SystemUI.setBackgroundColorAsync(t.bg).catch(() => {}); }, [t.bg]);

  // Splash holds ~3 s or until auth resolves (whichever is later), then fades 500 ms.
  const canLeaveSplash = fontsDone && hydrated && ready && held && ageOk;
  useEffect(() => {
    if (!canLeaveSplash || routed.current) return;
    routed.current = true;
    // Guests land on onboarding — unless a deep link already points somewhere specific.
    if (!useSession.getState().user && !deepLinked.current) router.replace("/onboarding");
    Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setSplashGone(true));
  }, [canLeaveSplash, fade, router]);

  if (!fontsDone || !hydrated) return <View style={{ flex: 1, backgroundColor: "#14100E" }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style={!splashGone && ageOk ? "light" : t.name === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: "slide_from_right" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="pisco/[ref]" />
          <Stack.Screen name="producer/[slug]" />
          <Stack.Screen name="bottle/[id]" options={{ presentation: "modal", animation: "slide_from_bottom", gestureEnabled: false }} />
        </Stack>
        <ProfileSheet />
        <Toast />
        {!ageOk ? (
          <View style={StyleSheet.absoluteFill}><AgeGate /></View>
        ) : !splashGone ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="none"><Splash /></Animated.View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}
