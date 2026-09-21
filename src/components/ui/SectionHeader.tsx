import { View } from "react-native";
import { Chakana } from "@/components/motifs";
import { useTheme } from "@/theme";
import { Mono } from "./Text";

/** Mono label + 1 px accent rule + 11 px chakana terminal. */
export function SectionHeader({ label, gloss, right }: { label: string; gloss?: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Mono size={10} ls={0.22} color={t.gold}>{label}{gloss ? <Mono size={10} ls={0.22} color={t.muted3}>{`  /  ${gloss}`}</Mono> : null}</Mono>
      <View style={{ flex: 1, height: 1, backgroundColor: t.goldA(0.35) }} />
      {right ?? <Chakana size={11} />}
    </View>
  );
}
