import type { AwardLevel, FlavourAxis, PiscoDetail, PiscoInput, PiscoStyle, StillType } from "@/api/types";

export type SlotKind = "bottle" | "label";

export interface PhotoSlot {
  /** Local preview while (and after) uploading. */
  localUri?: string;
  /** API-relative url of an already stored photo. */
  url?: string;
  key?: string;
  width?: number;
  height?: number;
  phash?: string;
  /** 0–1 while uploading, null when idle. */
  progress: number | null;
  error?: string;
}

export interface AwardDraft { competition: string; level: AwardLevel; year: string; sourceUrl?: string | null }

export interface BottleForm {
  name: string;
  style: PiscoStyle | null;
  place: string | null; // `${regionSlug}|${valley}`
  vintage: string;
  abv: string;
  bottleSizeMl: number | null;
  restMonths: string;
  stillType: StillType | null;
  distillations: number | null;
  description: string;
  varieties: string[];
  noteIds: string[];
  flavours: Partial<Record<FlavourAxis, number>>;
  priceSoles: string;
  awards: AwardDraft[];
  photos: Partial<Record<SlotKind, PhotoSlot>>;
  /** Stored photos of kinds this wizard has no slot for; re-sent untouched when photos change. */
  extraPhotos: NonNullable<PiscoInput["photos"]>;
}

export const emptyForm: BottleForm = {
  name: "", style: null, place: null, vintage: "", abv: "", bottleSizeMl: null, restMonths: "", stillType: null, distillations: null,
  description: "", varieties: [], noteIds: [], flavours: {}, priceSoles: "", awards: [], photos: {}, extraPhotos: [],
};

const keyFromUrl = (url: string) => url.replace(/^.*\/media\//, "").replace(/\?.*$/, "");
const dec = (s: string) => Number(s.replace(",", "."));
const numOrNull = (s: string) => (s.trim() === "" || Number.isNaN(dec(s)) ? null : dec(s));

export function fromDetail(p: PiscoDetail): BottleForm {
  const slot = (kind: SlotKind): PhotoSlot | undefined => {
    const ph = p.photos.find((x) => x.kind === kind);
    return ph ? { url: ph.url, key: keyFromUrl(ph.url), progress: null } : undefined;
  };
  const own = p.prices.find((x) => x.retailer === "Precio sugerido por la bodega");
  return {
    name: p.name === "Nueva botella" ? "" : p.name,
    style: p.style,
    place: p.region ? `${p.region.slug}|${p.valley ?? ""}` : null,
    vintage: p.vintage?.toString() ?? "",
    abv: p.abvPct != null ? String(p.abvPct).replace(".", ",") : "",
    bottleSizeMl: p.bottleSizeMl,
    restMonths: p.restMonths?.toString() ?? "",
    stillType: p.stillType,
    distillations: p.distillations,
    description: p.description ?? "",
    varieties: p.varietyShares.map((v) => v.slug),
    noteIds: p.notes.map((n) => n.id),
    flavours: Object.fromEntries(p.flavours.map((f) => [f.axis, f.value])),
    priceSoles: own ? String(own.priceCents / 100).replace(".", ",") : "",
    awards: p.awards.map((a) => ({ competition: a.competition, level: a.level, year: String(a.year), sourceUrl: a.sourceUrl })),
    photos: { bottle: slot("bottle"), label: slot("label") },
    extraPhotos: p.photos.filter((x) => x.kind !== "bottle" && x.kind !== "label").map((x) => ({ key: keyFromUrl(x.url), kind: "lifestyle" as const })),
  };
}

/**
 * Drafts save anything, so every field is sent as-is (null when blank).
 * `photos` replaces the stored set wholesale and the detail payload does not expose phash,
 * so it is only included when the user changed a slot in this session.
 */
export function toInput(f: BottleForm, opts: { includePhotos: boolean; producerId?: string }): PiscoInput {
  const [regionSlug, valley] = f.place ? f.place.split("|") : [null, null];
  const input: PiscoInput = {
    name: f.name.trim() || undefined,
    style: f.style,
    regionSlug,
    valley: valley || null,
    vintage: numOrNull(f.vintage),
    abvPct: numOrNull(f.abv),
    bottleSizeMl: f.bottleSizeMl,
    restMonths: numOrNull(f.restMonths),
    stillType: f.stillType,
    distillations: f.distillations,
    description: f.description.trim() || null,
    varieties: f.varieties.map((slug) => ({ slug })),
    noteIds: f.noteIds,
    flavours: (Object.entries(f.flavours) as [FlavourAxis, number][]).map(([axis, value]) => ({ axis, value })),
    awards: f.awards.filter((a) => a.competition.trim().length >= 2 && a.year).map((a) => ({ competition: a.competition.trim(), level: a.level, year: Number(a.year), sourceUrl: a.sourceUrl ?? null })),
    priceSoles: numOrNull(f.priceSoles),
  };
  if (opts.producerId) input.producerId = opts.producerId;
  if (opts.includePhotos) {
    input.photos = [
      ...(["bottle", "label"] as const).flatMap((kind) => {
        const s = f.photos[kind];
        return s?.key ? [{ key: s.key, kind, width: s.width, height: s.height, phash: s.phash }] : [];
      }),
      ...f.extraPhotos,
    ];
  }
  return input;
}

/** Which wizard step owns a server field key (publish validation and zod paths). */
export function stepForField(key: string): 1 | 2 | 3 {
  if (key === "photos" || key.startsWith("photos.") || key === "name") return 1;
  if (["abvPct", "bottleSizeMl", "vintage", "style", "varieties", "regionSlug", "valley", "noteIds"].some((k) => key === k || key.startsWith(`${k}.`))) return 2;
  return 3;
}
