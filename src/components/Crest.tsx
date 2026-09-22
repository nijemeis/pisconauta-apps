import { Image } from "expo-image";
import { View } from "react-native";
import { mediaUrl, mediaWidthFor } from "@/api/client";
import { Chakana } from "@/components/motifs";
import { Display } from "@/components/ui";
import { useTheme } from "@/theme";

/** Circular bodega crest: the uploaded logo when there is one, else chakana over initials. */
export function Crest({ initials, logo, size = 86 }: { initials: string; logo?: string | null; size?: number }) {
  const t = useTheme();
  const base = { width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: t.gold, backgroundColor: t.bg, overflow: "hidden" as const };
  if (logo) return <Image source={{ uri: mediaUrl(logo, mediaWidthFor(size)) ?? undefined }} style={base} contentFit="cover" />;
  return (
    <View style={{ ...base, alignItems: "center", justifyContent: "center", gap: 2 }}>
      <Chakana size={Math.round(size * 0.28)} />
      <Display size={Math.round(size * 0.26)}>{initials}</Display>
    </View>
  );
}
