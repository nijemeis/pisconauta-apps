import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, api } from "@/api/client";
import type { ScanResult } from "@/api/types";
import { SuggestSheet } from "@/components/SuggestSheet";
import { CornerBrackets, Stripes } from "@/components/motifs";
import { Body, Display, GoldButton, Mono, OutlineButton, PhotoBox, RatingText } from "@/components/ui";
import { useT } from "@/i18n";
import { placeLine } from "@/lib/format";
import { toastError, useUi } from "@/state/ui";
import { ThemeScope, dark } from "@/theme";

type ScanState = "idle" | "streaming" | "matching" | "matched" | "no-match";

const FRAME_W = 230;
const FRAME_H = 320;
/** The design asks for ~2 frames/s-ish streaming; /api/scan allows 10/min, so after a short burst we slow down. */
const BURST_FRAMES = 3;
const BURST_MS = 2000;
const STEADY_MS = 7000;
const MISSES_BEFORE_NO_MATCH = 3;

/** 04 · Scan a label. Always dark: it is a viewfinder. */
export default function ScanScreen() {
  return <ThemeScope name="dark"><Scan /></ThemeScope>;
}

function Scan() {
  const c = dark;
  const tr = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [suggest, setSuggest] = useState(false);
  const busy = useRef(false);
  const frames = useRef(0);
  const misses = useRef(0);
  const line = useRef(new Animated.Value(0)).current;

  const granted = !!permission?.granted;
  const live = focused && granted && cameraReady;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(line, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(line, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    if (focused) loop.start();
    return () => loop.stop();
  }, [focused, line]);

  useEffect(() => { if (focused && permission && !permission.granted && permission.canAskAgain) requestPermission(); }, [focused, permission, requestPermission]);
  useEffect(() => { if (!focused) { setCameraReady(false); setState("idle"); setResult(null); frames.current = 0; misses.current = 0; } }, [focused]);
  useEffect(() => { if (live) setState((s) => (s === "idle" ? "streaming" : s)); }, [live]);

  const send = useCallback(async (uri: string, manual: boolean) => {
    setState("matching");
    try {
      const r = await api.scan({ uri, name: "scan.jpg", type: "image/jpeg" });
      setResult(r);
      if (r.candidates.length) { misses.current = 0; setState("matched"); return; }
      misses.current += 1;
      setState(manual || misses.current >= MISSES_BEFORE_NO_MATCH ? "no-match" : "streaming");
    } catch (e) {
      // Rate limit during streaming is expected now and then; only surface errors the user caused.
      if (manual || !(e instanceof ApiError && e.status === 429)) toastError(e);
      setState("streaming");
    }
  }, []);

  const capture = useCallback(async (manual: boolean) => {
    if (busy.current || !camera.current) return;
    busy.current = true;
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.5, shutterSound: false });
      frames.current += 1;
      if (shot?.uri) await send(shot.uri, manual);
    } catch (e) {
      if (manual) toastError(e);
    } finally {
      busy.current = false;
    }
  }, [send]);

  // Streaming: capture a frame on a timer while nothing is matched.
  useEffect(() => {
    if (!live || state !== "streaming") return;
    const id = setTimeout(() => capture(false), frames.current < BURST_FRAMES ? BURST_MS : STEADY_MS);
    return () => clearTimeout(id);
  }, [live, state, capture]);

  const pickFromLibrary = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (r.canceled || !r.assets[0]) return;
    busy.current = true;
    try { await send(r.assets[0].uri, true); } finally { busy.current = false; }
  };

  const resume = () => { setResult(null); misses.current = 0; setState(live ? "streaming" : "idle"); };
  const toSearch = () => {
    useUi.getState().setPendingSearch({ q: result?.ocrQuery ?? "" });
    resume();
    router.navigate("/search");
  };

  const top = result?.candidates[0];
  const sheetUp = state === "matched" || state === "no-match";

  return (
    <View style={{ flex: 1, backgroundColor: c.bar }}>
      {focused && granted ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} animateShutter={false} />
      ) : (
        <Stripes color="rgba(244,236,222,0.05)" period={14} stripe={1} />
      )}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(16,12,10,0.35)" }]} />

      <View style={{ paddingTop: insets.top + 22, alignItems: "center" }}>
        <Mono size={10} ls={0.24} color={c.ink2}>{tr(state === "matching" ? "scan.matching" : "scan.align")}</Mono>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: sheetUp ? 150 : 0 }}>
        <View style={{ width: FRAME_W, height: FRAME_H }}>
          <CornerBrackets outer={30} inner={14} offset={11} color={c.gold} innerColor={c.goldA(0.6)} />
          <Animated.View style={{ position: "absolute", left: 8, right: 8, top: 0, height: 1, transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [FRAME_H * 0.12, FRAME_H * 0.88] }) }] }}>
            <LinearGradient colors={["transparent", c.gold, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          </Animated.View>
        </View>

        {permission && !granted ? (
          <View style={{ position: "absolute", left: 28, right: 28, gap: 12, alignItems: "center", backgroundColor: c.bg, borderWidth: 1, borderColor: c.goldA(0.3), padding: 20 }}>
            <Display size={22} center color={c.ink}>{tr("scan.permTitle")}</Display>
            <Body size={12} center color={c.ink3}>{tr("scan.permBody")}</Body>
            <GoldButton label={tr("scan.permCta")} onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())} style={{ alignSelf: "stretch", backgroundColor: c.gold }} />
          </View>
        ) : null}
      </View>

      {!sheetUp ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 34, paddingBottom: 26 }}>
          <Pressable onPress={pickFromLibrary} hitSlop={10} accessibilityRole="button" style={{ width: 84, alignItems: "center" }}>
            <Mono size={10} ls={0.2} color={c.ink2}>{tr("scan.gallery")}</Mono>
          </Pressable>
          <Pressable onPress={() => capture(true)} disabled={!live || state === "matching"} accessibilityRole="button" accessibilityLabel={tr("scan.shutter")}
            style={({ pressed }) => ({ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: c.gold, alignItems: "center", justifyContent: "center", opacity: !live ? 0.35 : pressed ? 0.7 : 1 })}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: state === "matching" ? c.goldA(0.35) : c.gold }} />
          </Pressable>
          <View style={{ width: 84 }} />
        </View>
      ) : null}

      {state === "matched" && top ? (
        <View style={{ backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.goldA(0.3), padding: 20, gap: 14 }}>
          <Mono size={10} ls={0.22} color={c.gold}>{tr("scan.recognised")}</Mono>
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <PhotoBox src={top.pisco.photo} width={62} height={86} />
            <View style={{ flex: 1, gap: 3 }}>
              <Display size={24} color={c.ink} numberOfLines={2}>{`${top.pisco.name}${top.pisco.vintage ? ` ${top.pisco.vintage}` : ""}`}</Display>
              <Body size={12} color={c.ink4} numberOfLines={1}>{placeLine(top.pisco)}</Body>
              <Mono size={10} ls={0.18} color={c.muted}>{`${tr("scan.confidence")} ${Math.round(top.confidence * 100)} %`}</Mono>
            </View>
            <RatingText value={top.pisco.avgRating} size={24} color={c.gold} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <GoldButton label={tr("scan.view")} style={{ flex: 1, backgroundColor: c.gold }} onPress={() => { const slug = top.pisco.slug; resume(); router.push(`/pisco/${slug}`); }} />
            <OutlineButton label={tr("scan.notThis")} style={{ flex: 1, borderColor: dark.hair(0.2) }} onPress={toSearch} />
          </View>
        </View>
      ) : null}

      {state === "no-match" ? (
        <View style={{ backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.goldA(0.3), padding: 20, gap: 12 }}>
          <Mono size={10} ls={0.22} color={c.gold}>{tr("scan.noMatchKicker")}</Mono>
          <Display size={24} color={c.ink}>{tr("scan.noMatchTitle")}</Display>
          <Body size={12} color={c.ink3}>{tr("scan.noMatchBody")}</Body>
          <GoldButton label={tr("scan.suggest")} onPress={() => setSuggest(true)} style={{ backgroundColor: c.gold }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <OutlineButton label={tr("scan.manual")} style={{ flex: 1, borderColor: dark.hair(0.2) }} onPress={toSearch} />
            <OutlineButton label={tr("scan.again")} style={{ flex: 1, borderColor: dark.hair(0.2) }} onPress={resume} />
          </View>
        </View>
      ) : null}

      <SuggestSheet open={suggest} onClose={() => setSuggest(false)} initialName={result?.ocrQuery} />
    </View>
  );
}
