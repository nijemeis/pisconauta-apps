import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { ApiError, api } from "@/api/client";
import type { Currency, PlaceInput, PlaceListing } from "@/api/types";
import { Body, Display, Field, FieldError, GoldButton, Mono, Segmented, Sheet } from "@/components/ui";
import { useT } from "@/i18n";
import { usePrefs } from "@/state/prefs";
import { toast } from "@/state/ui";
import { useTheme } from "@/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  pisco: { id: string; name: string };
  onAdded: (prices: PlaceListing[]) => void;
}

/** "12,50" / "12.50" / "S/ 1.250,00" → number, or null when it is not a positive amount. */
export function parsePrice(raw: string): number | null {
  let s = raw.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (lastSep >= 0 && s.length - lastSep - 1 <= 2) s = `${s.slice(0, lastSep).replace(/[.,]/g, "")}.${s.slice(lastSep + 1)}`;
  else s = s.replace(/[.,]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function normaliseUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const url = /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, "")}`;
  return /^https?:\/\/[^\s/.]+\.[^\s]+$/i.test(url) ? url : null;
}

/** "Lo encontré aquí" — a community-added store or webshop with the price seen. */
export function PlaceSheet({ open, onClose, pisco, onAdded }: Props) {
  const t = useTheme();
  const tr = useT();
  const [kind, setKind] = useState<"store" | "webshop">("store");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<Currency>(() => usePrefs.getState().currency);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [url, setUrl] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("store"); setName(""); setPrice(""); setCurrency(usePrefs.getState().currency); setAddress(""); setCity(""); setUrl(""); setFields({}); setError(null);
  }, [open]);

  const send = async () => {
    const errs: Record<string, string> = {};
    const amount = parsePrice(price);
    const link = kind === "webshop" ? normaliseUrl(url) : null;
    if (name.trim().length < 2) errs.name = tr("place.errName");
    if (amount == null) errs.price = tr("place.errPrice");
    if (kind === "store" && !address.trim() && !city.trim()) errs.address = tr("place.errWhere");
    if (kind === "webshop" && !link) errs.url = tr("place.errUrl");
    setFields(errs); setError(null);
    if (Object.keys(errs).length || amount == null) return;

    const input: PlaceInput = kind === "store"
      ? { kind, name: name.trim(), price: amount, currency, address: address.trim() || null, city: city.trim() || null }
      : { kind, name: name.trim(), price: amount, currency, url: link };
    setBusy(true);
    try {
      const res = await api.addPlace(pisco.id, input);
      onAdded(res.prices);
      toast(tr("place.saved"));
      onClose();
    } catch (e) {
      if (e instanceof ApiError) { setFields(e.fields ?? {}); setError(e.message); } else setError(tr("common.error"));
    } finally { setBusy(false); }
  };

  const known = ["name", "price", "currency", "address", "city", "url"];
  const showGeneral = error && !known.some((k) => fields[k]);

  return (
    <Sheet open={open} onClose={onClose} maxHeightPct={0.92}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 18 }}>
        <View style={{ gap: 4 }}>
          <Mono size={10} ls={0.22} color={t.gold}>DÓNDE COMPRAR / WHERE TO BUY</Mono>
          <Display size={24}>{tr("place.title")}</Display>
          <Body size={12} color={t.ink4} numberOfLines={2}>{`${pisco.name} · ${tr("place.body")}`}</Body>
        </View>
        <Segmented options={[{ value: "store", label: tr("place.kindStore") }, { value: "webshop", label: tr("place.kindWeb") }]} value={kind} onChange={(k) => { setKind(k); setFields({}); }} />
        <Field label={tr("place.name")} value={name} onChangeText={setName} error={fields.name} maxLength={120} autoCapitalize="words" />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <Field label={tr("place.price")} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0,00" maxLength={10} style={{ flex: 1 }} error={fields.price ?? fields.currency} />
          <View style={{ width: 168, marginTop: 16 }}>
            <Segmented options={[{ value: "PEN", label: "S/" }, { value: "USD", label: "US$" }, { value: "EUR", label: "€" }]} value={currency} onChange={setCurrency} />
          </View>
        </View>
        {kind === "store" ? (
          <>
            <Field label={tr("place.address")} value={address} onChangeText={setAddress} error={fields.address} size={20} maxLength={200} />
            <Field label={tr("place.city")} value={city} onChangeText={setCity} error={fields.city} size={20} maxLength={80} autoCapitalize="words" />
          </>
        ) : (
          <Field label={tr("place.url")} plain value={url} onChangeText={setUrl} error={fields.url} placeholder="https://" autoCapitalize="none" autoCorrect={false} keyboardType="url" maxLength={500} />
        )}
        {showGeneral ? <FieldError message={error} /> : null}
        <GoldButton label={tr("place.save")} onPress={send} loading={busy} />
      </ScrollView>
    </Sheet>
  );
}
