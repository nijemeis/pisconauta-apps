import { useCallback, useEffect, useRef, useState } from "react";

interface State<T> { data: T | null; error: Error | null; loading: boolean }

/** Minimal fetch-on-mount hook with reload; ignores results from superseded calls. */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: enabled });
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (silent = false) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, error: null, loading: false });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ data: silent ? s.data : null, error: e as Error, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
    else setState({ data: null, error: null, loading: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, load, ...deps]);

  return { ...state, reload: load, setData: (data: T) => setState({ data, error: null, loading: false }) };
}
