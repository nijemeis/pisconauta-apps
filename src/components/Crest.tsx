import { View } from "react-native";
import { Chakana } from "@/components/motifs";
import { Display } from "@/components/ui";
import { useTheme } from "@/theme";

/** Circular bodega crest: chakana over initials, accent border. */
export function Crest({ initials, size = 86 }: { initials: string; size?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: t.gold, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", gap: 2 }}>
      <Chakana size={Math.round(size * 0.28)} />
      <Display size={Math.round(size * 0.26)}>{initials}</Display>
    </View>
  );
}

