import { useSyncExternalStore } from 'react';

/**
 * A twenty-line router. The brief forbids UI libraries and the shell needs exactly one thing from
 * routing: the current path, and a way to change it without a reload.
 */
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) {
    listener();
  }
}

export function navigate(path: string): void {
  if (path === window.location.pathname) {
    return;
  }

  window.history.pushState(null, '', path);
  notify();
}

export function useCurrentPath(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/'
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', notify);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.removeEventListener('popstate', notify);
    }
  };
}
