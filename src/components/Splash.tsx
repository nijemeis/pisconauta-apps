import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { Chakana, SteppedBand } from "@/components/motifs";
import { Mono } from "@/components/ui";
import { useT } from "@/i18n";
import { dark, fonts } from "@/theme";

/** 00 · Splash. Always the dark palette: it sits on photography. */
export function Splash() {
  const tr = useT();
  return (
    <View style={{ flex: 1, backgroundColor: dark.bg }}>
      <Image source={require("../../assets/splash-bg.jpg")} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={["rgba(20,16,14,0.2)", "rgba(20,16,14,0.38)", "rgba(20,16,14,0.8)"]} locations={[0, 0.38, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, alignItems: "center", paddingTop: 120, paddingHorizontal: 34, paddingBottom: 52 }}>
        <Chakana size={96} color={dark.gold} />
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fonts.displayLight, fontSize: 44, letterSpacing: 44 * 0.07, color: dark.ink, marginTop: 30, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 24 }}
        >
          PISCONAUTA<Text style={{ color: dark.terracotta }}>.</Text>
        </Text>
        <SteppedBand width={150} color={dark.gold} style={{ marginTop: 18 }} />
        <Mono size={11} ls={0.3} color={dark.ink2} center style={{ marginTop: 22, lineHeight: 20 }}>{tr("splash.tagline")}</Mono>
        <View style={{ flex: 1 }} />
        <Mono size={10} ls={0.24} color={dark.gold} center style={{ lineHeight: 20 }}>{"ICA · PISCO · LIMA\nAREQUIPA · MOQUEGUA · TACNA"}</Mono>
        <Mono size={10} ls={0.2} color={dark.muted3} center style={{ marginTop: 22 }}>D.O. PERÚ · v1.0</Mono>
      </View>
    </View>
  );
}
