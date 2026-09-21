import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { screenBottom } from "@/lib/insets";
import { useTheme } from "@/theme";
import { Toast } from "./Toast";

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const H = Dimensions.get("window").height;

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Card ground + accent border (filters) vs. page ground with an accent top rule (scan result). */
  tone?: "card" | "page";
  maxHeightPct?: number;
}

/** Bottom sheet: translateY, 240 ms cubic-bezier(.2,.8,.2,1). */
export function Sheet({ open, onClose, children, tone = "card", maxHeightPct = 0.86 }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(v, { toValue: 1, duration: 240, easing: EASE, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(v, { toValue: 0, duration: 240, easing: EASE, useNativeDriver: true }).start(({ finished }) => finished && setMounted(false));
    }
  }, [open, mounted, v]);

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim, opacity: v }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar" />
        </Animated.View>
        <Animated.View
          style={{
            maxHeight: H * maxHeightPct, backgroundColor: tone === "card" ? t.card : t.bg,
            borderWidth: tone === "card" ? 1 : 0, borderTopWidth: 1, borderBottomWidth: 0, borderColor: t.goldA(tone === "card" ? 0.35 : 0.3),
            paddingBottom: screenBottom(insets.bottom, 16), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [H * 0.7, 0] }) }],
          }}
        >
          <View style={{ alignSelf: "center", width: 36, height: 2, backgroundColor: t.hair(0.2), marginTop: 8 }} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
      {/* Modals sit above the root toast, so sheets carry their own. */}
      <Toast />
    </Modal>
  );
}
