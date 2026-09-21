import type {
  ApiErrorBody, AuthResult, Currency, Rates, CellarPayload, CellarState, CriteriaScores, Discover, Facets, Me, PiscoDetail, PiscoInput,
  PiscoStyle, PlaceInput, PlaceListing, ProducerCard, ProducerDetail, ReviewItem, ScanResult, SearchResult, Sort, Taxonomy,
} from "./types";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3100").replace(/\/+$/, "");

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => { authToken = t; };

/** Sent as Accept-Language on every request so the API localises its error messages. Set by the prefs store. */
let apiLanguage: "es" | "en" = "es";
export const setApiLocale = (locale: "es-PE" | "en") => { apiLanguage = locale === "en" ? "en" : "es"; };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

const NETWORK_MESSAGE = "Sin conexión con PISCONAUTA. Inténtalo de nuevo.";

/** Zod's default range/type messages reach us in English; everything else from the API is already Spanish. */
const ENGLISH_ZOD = /^(Too (big|small)|Invalid|Expected|Required|Unrecognized)/;

function toError(status: number, json: unknown): ApiError {
  const e = (json as ApiErrorBody | null)?.error;
  const fields = e?.fields && Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, ENGLISH_ZOD.test(v) ? "Valor no válido." : v]));
  return new ApiError(status, e?.code ?? "server", e?.message ?? "Algo salió mal. Inténtalo de nuevo.", fields);
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": apiLanguage };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(API_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new ApiError(0, "network", NETWORK_MESSAGE);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw toError(res.status, json);
  return json as T;
}

export interface UploadResult { key: string; url: string; width: number; height: number; phash: string }
export interface LocalFile { uri: string; name?: string; type?: string }

/** Multipart POST over XHR so upload progress is observable (fetch has no upload progress in RN). */
function multipart<T>(path: string, file: LocalFile, extra: Record<string, string> = {}, onProgress?: (p: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const form = new FormData();
    // React Native's FormData takes a { uri, name, type } descriptor in place of a Blob.
    form.append("file", { uri: file.uri, name: file.name ?? "photo.jpg", type: file.type ?? "image/jpeg" } as unknown as Blob);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL + path);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Accept-Language", apiLanguage);
    if (authToken) xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    if (onProgress) xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new ApiError(0, "network", NETWORK_MESSAGE));
    xhr.ontimeout = () => reject(new ApiError(0, "network", NETWORK_MESSAGE));
    xhr.timeout = 60_000;
    xhr.onload = () => {
      let json: unknown = null;
      try { json = JSON.parse(xhr.responseText); } catch { /* non-JSON body */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(json as T);
      else reject(toError(xhr.status, json));
    };
    xhr.send(form);
  });
}

export interface SearchState {
  q: string;
  style: PiscoStyle[];
  variety: string[];
  region: string[];
  abvMin?: number;
  abvMax?: number;
  priceMax?: number;
  ratingMin?: number;
  sort: Sort;
}

export function searchQuery(s: SearchState, cursor?: string | null): string {
  const p: string[] = [];
  const add = (k: string, v: string | number | undefined | null) => { if (v !== undefined && v !== null && v !== "") p.push(`${k}=${encodeURIComponent(String(v))}`); };
  add("q", s.q.trim());
  add("style", s.style.map((x) => x.replace(/_/g, "-")).join(","));
  add("variety", s.variety.join(","));
  add("region", s.region.join(","));
  add("abv_min", s.abvMin);
  add("abv_max", s.abvMax);
  add("price_max", s.priceMax);
  add("rating_min", s.ratingMin);
  add("sort", s.sort);
  add("cursor", cursor);
  return p.join("&");
}

export const api = {
  signup: (b: { email: string; password: string; displayName: string; role: "enthusiast" | "producer"; birthYear?: number; locale?: string }) =>
    request<AuthResult>("POST", "/api/auth/signup", b),
  login: (b: { email: string; password: string }) => request<AuthResult>("POST", "/api/auth/login", b),
  logout: () => request<unknown>("POST", "/api/auth/logout"),
  authProviders: () => request<{ google: boolean; apple: boolean }>("GET", "/api/auth/providers"),
  exchangeCode: (code: string, verifier: string) => request<AuthResult>("POST", "/api/auth/exchange", { code, verifier }),
  me: () => request<Me>("GET", "/api/me"),
  deleteMe: () => request<unknown>("DELETE", "/api/me"),
  patchMe: (b: { displayName?: string; locale?: "es-PE" | "en"; theme?: "dark" | "light"; currency?: Currency }) => request<Me>("PATCH", "/api/me", b),

  rates: () => request<Rates>("GET", "/api/rates"),

  discover: () => request<Discover>("GET", "/api/discover"),
  taxonomy: () => request<Taxonomy>("GET", "/api/taxonomy"),
  search: (s: SearchState, cursor?: string | null, signal?: AbortSignal) => request<SearchResult>("GET", `/api/piscos?${searchQuery(s, cursor)}`, undefined, signal),
  facets: (s: SearchState, signal?: AbortSignal) => request<Facets>("GET", `/api/facets?${searchQuery(s)}`, undefined, signal),

  pisco: (ref: string) => request<PiscoDetail>("GET", `/api/piscos/${encodeURIComponent(ref)}`),
  reviews: (ref: string) => request<{ items: ReviewItem[] }>("GET", `/api/piscos/${encodeURIComponent(ref)}/reviews`),
  postReview: (ref: string, b: { criteria: CriteriaScores; body?: string | null }) => request<unknown>("POST", `/api/piscos/${encodeURIComponent(ref)}/reviews`, b),
  addPlace: (ref: string, b: PlaceInput) => request<{ prices: PlaceListing[] }>("POST", `/api/piscos/${encodeURIComponent(ref)}/places`, b),
  deletePlace: (id: string) => request<unknown>("DELETE", `/api/places/${encodeURIComponent(id)}`),

  cellar: () => request<CellarPayload>("GET", "/api/cellar"),
  putCellar: (piscoId: string, b: { state: CellarState; personalScore?: number | null; note?: string | null }) => request<unknown>("PUT", `/api/cellar/${piscoId}`, b),
  deleteCellar: (piscoId: string) => request<unknown>("DELETE", `/api/cellar/${piscoId}`),

  producers: () => request<{ items: ProducerCard[] }>("GET", "/api/producers"),
  producer: (ref: string, manage = false) => request<ProducerDetail>("GET", `/api/producers/${encodeURIComponent(ref)}${manage ? "?manage=1" : ""}`),
  claimProducer: (b: { name: string; regionSlug?: string | null; valley?: string | null; foundedYear?: number | null; description?: string | null; ruc?: string; website?: string }) =>
    request<ProducerDetail>("POST", "/api/producers", b),

  createPisco: (b: PiscoInput) => request<PiscoDetail>("POST", "/api/piscos", b),
  patchPisco: (id: string, b: PiscoInput) => request<PiscoDetail>("PATCH", `/api/piscos/${id}`, b),
  publishPisco: (id: string) => request<PiscoDetail>("POST", `/api/piscos/${id}/publish`),

  upload: (file: LocalFile, kind: "pisco" | "cover" | "review", onProgress?: (p: number) => void) => multipart<UploadResult>("/api/uploads", file, { kind }, onProgress),
  scan: (file: LocalFile) => multipart<ScanResult>("/api/scan", file),
  suggest: (b: { name: string; producerName?: string | null; note?: string | null }) => request<unknown>("POST", "/api/suggestions", b),
};

/** Absolute URL for an API-relative media path, optionally on the 200/400/600/1200 derivative ladder. */
export function mediaUrl(path: string | null | undefined, w?: 200 | 400 | 600 | 1200): string | null {
  if (!path) return null;
  const abs = /^https?:/.test(path) ? path : API_URL + path;
  return w ? `${abs}${abs.includes("?") ? "&" : "?"}w=${w}` : abs;
}
