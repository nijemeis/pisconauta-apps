import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useSession } from "@/state/session";

/** Guests browse freely; anything that writes sends them to onboarding. Returns true when signed in. */
export function useRequireAuth() {
  const router = useRouter();
  return useCallback(() => {
    if (useSession.getState().user) return true;
    router.push("/onboarding");
    return false;
  }, [router]);
}
