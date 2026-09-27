import { useEffect, useRef, useState, type DependencyList } from 'react';

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Runs `fetcher` whenever `deps` changes, tracking loading/error/data state
 * and ignoring results from a request that was superseded before it resolved.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, isLoading: true, error: null });
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    fetcher()
      .then((data) => {
        if (currentRequest === requestId.current) {
          setState({ data, isLoading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (currentRequest === requestId.current) {
          const message = err instanceof Error ? err.message : 'Something went wrong.';
          setState({ data: null, isLoading: false, error: message });
        }
      });
  }, deps);

  return state;
}
