import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUi } from "@/state/ui";
import { useTheme } from "@/theme";
import { Body } from "./Text";

/** Bottom toast on the card ground with an accent border. Mounted once at the root. */
export function Toast() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => finished && hide());
    }, 3200);
    return () => clearTimeout(timer);
  }, [current, hide, v]);

  if (!current) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute", left: 20, right: 20, bottom: insets.bottom + 76, backgroundColor: t.card, borderWidth: 1, borderColor: t.gold,
        paddingVertical: 13, paddingHorizontal: 16, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <Body size={13} color={t.ink} center>{current.message}</Body>
    </Animated.View>
  );
}
