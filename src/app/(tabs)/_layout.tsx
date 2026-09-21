import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bottomPad } from "@/lib/insets";
import { Chakana } from "@/components/motifs";
import { Mono } from "@/components/ui";
import { useT, type Key } from "@/i18n";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme";

const LABELS: Record<string, Key> = { index: "tab.discover", search: "tab.search", scan: "tab.scan", cellar: "tab.cellar", bodega: "tab.bodega" };

/** 5 items, 13 px chakana over a mono label; active accent, inactive muted at 62 %. BODEGA is producer-only. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const isProducer = useSession((s) => s.user?.role === "producer");
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.bar, borderTopWidth: 1, borderTopColor: t.hair(0.08), paddingTop: 12, paddingBottom: bottomPad(insets.bottom, 14) }}>
      {state.routes.map((route, i) => {
        if (!(route.name in LABELS)) return null;
        if (route.name === "bodega" && !isProducer) return null;
        const focused = state.index === i;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tr(LABELS[route.name])}
            onPress={() => {
              const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: "center", gap: 6, opacity: focused ? 1 : 0.62 }}
          >
            <Chakana size={13} color={focused ? t.gold : t.muted3} />
            <Mono size={10} ls={0.1} color={focused ? t.gold : t.muted3} numberOfLines={1}>{tr(LABELS[route.name])}</Mono>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="cellar" />
      <Tabs.Screen name="bodega" />
    </Tabs>
  );
}
