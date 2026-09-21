import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { screenBottom } from "@/lib/insets";
import { Chakana, SteppedBand } from "@/components/motifs";
import { Body, Display, GoldButton, Mono, OutlineButton } from "@/components/ui";
import { useT } from "@/i18n";
import { usePrefs } from "@/state/prefs";
import { useTheme } from "@/theme";

/** First-launch 18+ gate (alcohol content). The answer is persisted; "no" is a dead end by design. */
export function AgeGate() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const confirm = usePrefs((s) => s.confirmAge);
  const [denied, setDenied] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 72, paddingBottom: screenBottom(insets.bottom, 40), paddingHorizontal: 28 }}>
      <SteppedBand />
      <View style={{ alignItems: "center", gap: 18, marginTop: 56, flex: 1 }}>
        <Chakana size={56} />
        <Mono size={10} ls={0.3} color={t.gold}>{tr("age.kicker")}</Mono>
        <Display size={34} center>{denied ? tr("age.deniedTitle") : tr("age.title")}</Display>
        <Body size={13} lh={1.6} center color={t.ink3}>{denied ? tr("age.deniedBody") : tr("age.body")}</Body>
      </View>
      {denied ? (
        <OutlineButton label={tr("age.back")} onPress={() => setDenied(false)} />
      ) : (
        <View style={{ gap: 10 }}>
          <GoldButton label={tr("age.yes")} onPress={confirm} />
          <OutlineButton label={tr("age.no")} onPress={() => setDenied(true)} />
        </View>
      )}
      <Mono size={10} ls={0.2} center color={t.muted3} style={{ marginTop: 22 }}>{tr("age.footer")}</Mono>
    </View>
  );
}
