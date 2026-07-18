"use client";

// A tiny stale-while-revalidate cache for client-fetched data.
//
// Several dashboard components (History, Goals, daily progress, stat cards,
// activity heatmap) all fetch the same underlying data (sessions, habits).
// Without a shared cache, every mount/tab-switch re-fetches from scratch and
// briefly renders an empty/skeleton state before the data arrives.
//
// A `Resource` fetches once, caches the result in memory for the lifetime of
// the tab, and shares it across every subscriber. Re-mounting a component
// (e.g. switching tabs back and forth) renders the cached data immediately
// while quietly revalidating in the background — no more "zero items, then
// suddenly populated" flicker after the first load.

import { useCallback, useEffect, useSyncExternalStore } from "react";

type Listener = () => void;
type Fetcher<T> = () => Promise<T>;

export interface Resource<T> {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => T | undefined;
  isLoading: () => boolean;
  /** Fetch if not already cached; returns the in-flight/cached promise otherwise. */
  load: () => Promise<T>;
  /** Re-fetch in the background without clearing the currently cached value. */
  revalidate: () => Promise<T>;
  /** Directly update the cached value (e.g. after an optimistic mutation). */
  mutate: (updater: T | ((prev: T | undefined) => T)) => void;
  /** Clear the cache entirely (e.g. on sign-out). */
  reset: () => void;
}

export function createResource<T>(fetcher: Fetcher<T>): Resource<T> {
  let data: T | undefined;
  let loading = true;
  let inFlight: Promise<T> | null = null;
  const listeners = new Set<Listener>();

  const notify = () => listeners.forEach((listener) => listener());

  const runFetch = (): Promise<T> => {
    loading = data === undefined;
    if (loading) notify();
    const promise = fetcher()
      .then((result) => {
        data = result;
        loading = false;
        inFlight = null;
        notify();
        return result;
      })
      .catch((err) => {
        loading = false;
        inFlight = null;
        notify();
        throw err;
      });
    inFlight = promise;
    return promise;
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => data,
    isLoading: () => loading,
    load() {
      if (data !== undefined) return Promise.resolve(data);
      if (inFlight) return inFlight;
      return runFetch();
    },
    revalidate() {
      if (inFlight) return inFlight;
      return runFetch();
    },
    mutate(updater) {
      data = typeof updater === "function" ? (updater as (prev: T | undefined) => T)(data) : updater;
      notify();
    },
    reset() {
      data = undefined;
      loading = true;
      inFlight = null;
      notify();
    },
  };
}

/** Subscribes a component to a Resource, triggering the initial load (or a silent background revalidate if already cached). */
export function useResource<T>(resource: Resource<T>) {
  const data = useSyncExternalStore(resource.subscribe, resource.getSnapshot, () => undefined);
  const isLoading = useSyncExternalStore(resource.subscribe, resource.isLoading, () => true);

  useEffect(() => {
    if (resource.getSnapshot() === undefined) {
      resource.load();
    } else {
      resource.revalidate();
    }
  }, [resource]);

  const refetch = useCallback(() => resource.revalidate(), [resource]);

  return { data, loading: isLoading && data === undefined, refetch } as const;
}
