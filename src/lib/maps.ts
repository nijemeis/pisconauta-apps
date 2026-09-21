import { Linking, Platform } from "react-native";

export interface MapTarget { name: string; address?: string | null; city?: string | null; lat?: number | null; lng?: number | null }

/** Opens the native maps app with directions to a store; falls back to Google Maps on the web. */
export async function openDirections(p: MapTarget): Promise<void> {
  const hasCoords = typeof p.lat === "number" && typeof p.lng === "number";
  const text = [p.name, p.address, p.city].filter(Boolean).join(", ");
  const query = encodeURIComponent(text);
  const name = encodeURIComponent(p.name);
  const fallback = `https://www.google.com/maps/search/?api=1&query=${hasCoords ? `${p.lat},${p.lng}` : query}`;

  if (Platform.OS === "ios") {
    await Linking.openURL(`http://maps.apple.com/?daddr=${hasCoords ? `${p.lat},${p.lng}` : query}&q=${name}`);
    return;
  }
  if (Platform.OS === "android") {
    const geo = hasCoords ? `geo:0,0?q=${p.lat},${p.lng}(${name})` : `geo:0,0?q=${query}`;
    try {
      if (await Linking.canOpenURL(geo)) { await Linking.openURL(geo); return; }
    } catch { /* no maps handler — use the browser */ }
  }
  await Linking.openURL(fallback);
}
