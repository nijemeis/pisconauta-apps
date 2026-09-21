import { useEffect, useState } from "react";
import { View } from "react-native";
import { ApiError, api } from "@/api/client";
import { Body, Display, Field, FieldError, GoldButton, Sheet } from "@/components/ui";
import { useT } from "@/i18n";
import { toast } from "@/state/ui";
import { useTheme } from "@/theme";

/** "Sugerir botella" — queues a submission for the bodega/admin when scan or search finds nothing. */
export function SuggestSheet({ open, onClose, initialName }: { open: boolean; onClose: () => void; initialName?: string | null }) {
  const t = useTheme();
  const tr = useT();
  const [name, setName] = useState("");
  const [producerName, setProducerName] = useState("");
  const [note, setNote] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setName(initialName ?? ""); setFields({}); setError(null); } }, [open, initialName]);

  const send = async () => {
    setBusy(true); setFields({}); setError(null);
    try {
      await api.suggest({ name: name.trim(), producerName: producerName.trim() || null, note: note.trim() || null });
      toast(tr("suggest.sent"));
      setProducerName(""); setNote("");
      onClose();
    } catch (e) {
      if (e instanceof ApiError) { setFields(e.fields ?? {}); setError(e.message); } else setError(tr("common.error"));
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 18 }}>
        <View style={{ gap: 4 }}>
          <Display size={24}>{tr("suggest.title")}</Display>
          <Body size={12} color={t.ink4}>{tr("suggest.body")}</Body>
        </View>
        <Field label={tr("suggest.name")} value={name} onChangeText={setName} error={fields.name} />
        <Field label={tr("suggest.producer")} value={producerName} onChangeText={setProducerName} error={fields.producerName} size={20} />
        <Field label={tr("suggest.note")} plain value={note} onChangeText={setNote} error={fields.note} />
        {error && !Object.keys(fields).length ? <FieldError message={error} /> : null}
        <GoldButton label={tr("suggest.send")} onPress={send} loading={busy} disabled={name.trim().length < 2} />
      </View>
    </Sheet>
  );
}
