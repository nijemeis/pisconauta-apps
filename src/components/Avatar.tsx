import { Pressable, View } from "react-native";
import { Stripes } from "@/components/motifs";
import { Display } from "@/components/ui";
import { useSession } from "@/state/session";
import { useUi } from "@/state/ui";
import { useTheme } from "@/theme";

/** 34 px avatar circle; opens the profile/settings sheet. Guests get the hatched placeholder. */
export function Avatar() {
  const t = useTheme();
  const user = useSession((s) => s.user);
  const initials = user?.displayName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <Pressable onPress={() => useUi.getState().setProfileOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Perfil y ajustes">
      <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: t.goldA(0.42), overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: t.card }}>
        {initials ? <Display size={16} color={t.gold}>{initials}</Display> : <Stripes color={t.goldA(0.35)} period={6} stripe={2} />}
      </View>
    </Pressable>
  );
}
