/**
 * The API contract. Dependency-free on purpose: the Expo app keeps a copy of this
 * file (app/src/api/types.ts) — change both together.
 */
export type PiscoStyle = "puro" | "acholado" | "mosto_verde";
export type StillType = "falca" | "alambique_cobre" | "otro";
export type PiscoStatus = "draft" | "in_review" | "published" | "archived";
export type ProducerStatus = "pending" | "verified" | "rejected";
export type UserRole = "enthusiast" | "producer" | "admin";
export type CellarState = "tasted" | "wishlist";
export type FlavourAxis = "cuerpo" | "dulzor" | "herbal" | "citrico" | "floral" | "alcohol";
export type AwardLevel = "gran_oro" | "oro" | "plata" | "bronce";
export type NoteFamily = "fruta" | "floral" | "herbal" | "especia" | "mineral" | "dulce";
export type Sort = "rating" | "new" | "price" | "name";

export type Currency = "PEN" | "USD" | "EUR";
/** Units of each currency per 1 sol; refreshed weekly server-side. GET /api/rates. */
export interface Rates { base: "PEN"; perPen: Record<Currency, number>; updatedAt: string | null }

/** The five things a taster scores with 1–5 stars; the overall score is their mean. */
export type RatingCriterion = "aroma" | "sabor" | "cuerpo" | "final" | "equilibrio";
export type CriteriaScores = Record<RatingCriterion, number>;

/** Where a bottle can be bought: a physical store (→ maps) or a webshop (→ website). */
export interface PlaceListing {
  id: string;
  retailer: string;
  kind: "store" | "webshop";
  priceCents: number;
  currency: string;
  url: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  inStock: boolean;
  source: "producer" | "community" | "admin";
  /** User who spotted it (community listings) — compare with Me.user.id to offer "remove". */
  addedById: string | null;
  updatedAt: string;
}

/** Body for POST /api/piscos/:ref/places. Webshops need `url`; stores need `address` or `city`. */
export interface PlaceInput {
  kind: "store" | "webshop";
  name: string;
  price: number;
  currency?: Currency;
  url?: string | null;
  address?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface Ref { slug: string; name: string }

export interface PiscoCard {
  id: string;
  slug: string;
  name: string;
  style: PiscoStyle | null;
  vintage: number | null;
  abvPct: number | null;
  bottleSizeMl: number | null;
  avgRating: number | null;
  ratingsCount: number;
  minPriceCents: number | null;
  featured: boolean;
  status: PiscoStatus;
  /** Admin's note when a submission was returned to draft; null otherwise. */
  reviewNote: string | null;
  /** Path relative to the API origin, e.g. /media/piscos/abc.jpg (append ?w=600 for a derivative). */
  photo: string | null;
  producer: Ref;
  region: Ref | null;
  valley: string | null;
  varieties: string[];
}

export interface NoteTerm { id: string; es: string; en: string; family: NoteFamily }

export interface PiscoDetail extends PiscoCard {
  producerId: string;
  description: string | null;
  restMonths: number | null;
  stillType: StillType | null;
  distillations: number | null;
  varietyShares: { slug: string; name: string; sharePct: number | null }[];
  photos: { id: string; key: string; url: string; kind: string; isPrimary: boolean; phash: string | null }[];
  notes: NoteTerm[];
  flavours: { axis: FlavourAxis; value: number }[];
  awards: { id: string; competition: string; level: AwardLevel; year: number; sourceUrl: string | null }[];
  prices: PlaceListing[];
  /** Community averages per criterion (null until someone has rated with stars). */
  criteria: { averages: CriteriaScores; count: number } | null;
  ranking: { position: number; variety: string } | null;
  producerInfo: { id: string; slug: string; name: string; crestInitials: string | null; valley: string | null; verified: boolean };
  siblings: PiscoCard[];
}

export interface ProducerCard {
  id: string;
  slug: string;
  name: string;
  foundedYear: number | null;
  region: Ref | null;
  valley: string | null;
  crestInitials: string;
  cover: string | null;
  /** Square logo uploaded by the bodega (null → show the chakana + initials crest). */
  logo: string | null;
  verified: boolean;
  status: ProducerStatus;
  avgRating: number | null;
  piscoCount: number;
  medalCount: number;
}

export interface ProducerDetail extends ProducerCard {
  description: string | null;
  history: string | null;
  visitInfo: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  ruc: string | null;
  piscos: PiscoCard[];
}

export interface SearchParams {
  q?: string;
  style: PiscoStyle[];
  variety: string[];
  region: string[];
  abvMin?: number;
  abvMax?: number;
  priceMax?: number;
  ratingMin?: number;
  vintage?: number;
  sort: Sort;
  cursor?: string;
}

export interface SearchResult {
  items: PiscoCard[];
  total: number;
  producerCount: number;
  nextCursor: string | null;
}

export interface FacetOption { value: string; label?: string; count: number }
export interface Facets {
  style: FacetOption[];
  variety: FacetOption[];
  region: FacetOption[];
  abv: { min: number; max: number };
}

export interface Taxonomy {
  regions: { id: string; slug: string; name: string; valleys: string[] }[];
  varieties: { id: string; slug: string; name: string; aromatic: boolean }[];
  noteTerms: NoteTerm[];
}

export interface Discover {
  cataDelDia: PiscoDetail | null;
  regions: { slug: string; name: string; valleys: string[] }[];
  mostoVerde: PiscoCard[];
  newest: PiscoCard[];
}

export interface Me {
  user: { id: string; email: string; displayName: string; role: UserRole; locale: string; theme: string; currency: Currency } | null;
  producers: { id: string; slug: string; name: string; status: ProducerStatus; role: "owner" | "editor" }[];
  cellar: { tasted: string[]; wishlist: string[] };
}

export interface AuthResult extends Me { token: string }

export interface CellarItem {
  pisco: PiscoCard;
  state: CellarState;
  personalScore: number | null;
  tastedAt: string | null;
  note: string | null;
}

export interface CellarPayload {
  tasted: CellarItem[];
  wishlist: CellarItem[];
  stats: { tastedCount: number; favouriteVariety: string | null; topRegion: string | null };
}

export interface ReviewItem {
  id: string;
  score: number;
  criteria: CriteriaScores | null;
  body: string | null;
  createdAt: string;
  author: string;
  mine: boolean;
}

export interface ScanResult {
  scanId: string;
  candidates: { pisco: PiscoCard; confidence: number }[];
  ocrQuery: string | null;
}

/** Body for POST /api/piscos and PATCH /api/piscos/:id — every field optional so drafts save anything. */
export interface PiscoInput {
  producerId?: string;
  name?: string;
  style?: PiscoStyle | null;
  regionSlug?: string | null;
  valley?: string | null;
  vintage?: number | null;
  abvPct?: number | null;
  bottleSizeMl?: number | null;
  restMonths?: number | null;
  stillType?: StillType | null;
  distillations?: number | null;
  description?: string | null;
  varieties?: { slug: string; sharePct?: number | null }[];
  noteIds?: string[];
  flavours?: { axis: FlavourAxis; value: number }[];
  awards?: { competition: string; level: AwardLevel; year: number; sourceUrl?: string | null }[];
  photos?: { key: string; kind: "bottle" | "label" | "lifestyle"; width?: number; height?: number; phash?: string }[];
  priceSoles?: number | null;
}

export interface ApiErrorBody { error: { code: string; message: string; fields?: Record<string, string> } }
