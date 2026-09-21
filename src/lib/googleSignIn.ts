import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { API_URL, api } from "@/api/client";
import type { AuthResult } from "@/api/types";

const RETURN_URL = "pisconauta://auth";
const b64url = (b64: string) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export type GoogleOutcome = { ok: true; auth: AuthResult } | { ok: false; reason: "cancelled" | "failed" };

/**
 * Google sign-in through the system auth browser. The server runs the OAuth flow and finishes on
 * pisconauta://auth?code=…; that one-time code is only redeemable with the verifier kept here (PKCE-style),
 * so a token never travels through the redirect URL.
 */
export async function signInWithGoogle(role: "enthusiast" | "producer", locale: "es" | "en"): Promise<GoogleOutcome> {
  const bytes = Crypto.getRandomBytes(32);
  const verifier = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const challenge = b64url(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }));
  const start = `${API_URL}/api/auth/google?app=1&challenge=${challenge}&role=${role}&locale=${locale}`;

  const result = await WebBrowser.openAuthSessionAsync(start, RETURN_URL);
  if (result.type !== "success") return { ok: false, reason: "cancelled" };
  const query = result.url.split("?")[1] ?? "";
  const params = Object.fromEntries(query.split("&").map((kv) => kv.split("=").map(decodeURIComponent) as [string, string]));
  if (params.error === "google_cancelled") return { ok: false, reason: "cancelled" };
  if (!params.code) return { ok: false, reason: "failed" };
  try { return { ok: true, auth: await api.exchangeCode(params.code, verifier) }; }
  catch { return { ok: false, reason: "failed" }; }
}
