import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ApiError, api } from "@/api/client";
import type { CriteriaScores, RatingCriterion } from "@/api/types";
import { Body, Display, Field, FieldError, GoldButton, Mono, Sheet } from "@/components/ui";
import { useT } from "@/i18n";
import { CRITERIA, CRITERION_LABEL, num } from "@/lib/format";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { toast } from "@/state/ui";
import { useTheme } from "@/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  pisco: { id: string; name: string };
  initial?: { criteria: CriteriaScores | null; body: string | null } | null;
  onSaved: () => void;
}

/** Five-point star on a 24 × 24 box. */
const STAR = "M12 2.2l2.95 6.2 6.8.88-4.98 4.72 1.26 6.74L12 17.44 5.97 20.74l1.26-6.74L2.25 9.28l6.8-.88z";

export function Star({ filled, size = 26 }: { filled: boolean; size?: number }) {
  const t = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={filled ? t.gold : "none"} stroke={filled ? t.gold : t.hair(0.32)} strokeWidth={1} strokeLinejoin="miter" />
    </Svg>
  );
}

function StarRow({ label, gloss, value, onChange, starsLabel }: { label: string; gloss: string; value: number; onChange: (v: number) => void; starsLabel: (n: number) => string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: t.hair(0.08) }}>
      <View style={{ flexShrink: 1, gap: 1 }}>
        <Display size={19}>{label}</Display>
        <Mono size={10} ls={0.22} color={t.muted3}>{gloss}</Mono>
      </View>
      <View style={{ flexDirection: "row" }} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 5, now: value }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${label}: ${starsLabel(n)}`} accessibilityState={{ selected: value === n }}
            style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Star filled={n <= value} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type Draft = Partial<Record<RatingCriterion, number>>;

/** CATAR / RATE — five criteria, 1–5 stars each; the overall is their mean. Saving also files the bottle under CATADOS. */
export function RateSheet({ open, onClose, pisco, initial, onSaved }: Props) {
  const t = useTheme();
  const tr = useT();
  const locale = usePrefs((s) => s.locale);
  const [scores, setScores] = useState<Draft>({});
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const criteria0 = initial?.criteria ?? null;
  const body0 = initial?.body ?? null;
  useEffect(() => {
    if (!open) return;
    setScores(criteria0 ? { ...criteria0 } : {}); setBody(body0 ?? ""); setError(null); setFields({});
    // `initial` is rebuilt on every parent render; depend on its stable members so a re-render never wipes the draft.
  }, [open, criteria0, body0]);

  const complete = CRITERIA.every((c) => (scores[c] ?? 0) >= 1);
  const overall = complete ? CRITERIA.reduce((sum, c) => sum + (scores[c] ?? 0), 0) / CRITERIA.length : null;

  const save = async () => {
    if (!complete) return;
    setBusy(true); setError(null); setFields({});
    try {
      const criteria = Object.fromEntries(CRITERIA.map((c) => [c, Math.round(scores[c] as number)])) as CriteriaScores;
      await api.postReview(pisco.id, { criteria, body: body.trim() || null });
      useSession.getState().markTasted(pisco.id);
      toast(tr("rate.saved"));
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof ApiError) { setFields(e.fields ?? {}); setError(e.message); } else setError(tr("common.error"));
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} maxHeightPct={0.92}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Mono size={10} ls={0.22} color={t.gold}>CATAR / RATE</Mono>
            <Display size={24} numberOfLines={1}>{pisco.name}</Display>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Display size={52} color={overall == null ? t.hair(0.3) : t.gold} accessibilityLabel={`${tr("rate.overall")}: ${overall == null ? "—" : num(overall, locale)}`}>
              {overall == null ? "—" : num(overall, locale)}
            </Display>
            <Mono size={10} ls={0.2} color={t.muted3}>{tr("rate.overall")}</Mono>
          </View>
        </View>
        <View>
          {CRITERIA.map((c) => (
            <StarRow key={c} label={CRITERION_LABEL[c].es} gloss={CRITERION_LABEL[c].en} value={scores[c] ?? 0}
              onChange={(v) => setScores((s) => ({ ...s, [c]: v }))} starsLabel={(n) => tr("rate.stars", { n })} />
          ))}
        </View>
        {!complete ? <Mono size={10} ls={0.16} color={t.muted3}>{tr("rate.allFive")}</Mono> : null}
        <Field label={tr("rate.notes")} plain multiline value={body} onChangeText={setBody} error={fields.body} maxLength={1500} placeholder={tr("rate.notesPh")} />
        {error && !fields.body ? <FieldError message={error} /> : null}
        <Body size={12} color={t.ink4}>{tr("rate.hint")}</Body>
        <GoldButton label={tr("rate.save")} onPress={save} loading={busy} disabled={!complete} />
      </ScrollView>
    </Sheet>
  );
}
