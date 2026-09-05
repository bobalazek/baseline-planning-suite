import type { RemoteDescriptor } from '../config/runtime-config';

/**
 * A deliberate way to break a remote (F9).
 *
 * "If a remote fails to load, the shell stays alive and says so in place of that panel. Give us a
 * way to trigger it." This does not mock a failure or throw on purpose: it points the remote's
 * entry at a URL that does not exist, so Module Federation's real loader really fails, and the
 * shell's real recovery path is what the reviewer sees.
 *
 * Broken remotes are held in `sessionStorage`, so a reload keeps the fault and the degraded state
 * can be inspected properly — including whether the *other* app copes with a missing contract.
 */
const STORAGE_KEY = 'baseline.brokenRemotes';

export function readBrokenRemotes(search: string = window.location.search): ReadonlySet<string> {
  const fromQuery = new URLSearchParams(search).get('break');

  if (fromQuery !== null) {
    const keys = fromQuery.split(',').filter((key) => key.length > 0);

    writeBrokenRemotes(new Set(keys));

    return new Set(keys);
  }

  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '[]');

    return new Set(Array.isArray(stored) ? stored.filter((key) => typeof key === 'string') : []);
  } catch {
    return new Set();
  }
}

export function writeBrokenRemotes(keys: ReadonlySet<string>): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // A browser with storage disabled simply loses the fault on reload; nothing else depends on it.
  }
}

/** The entry a broken remote is pointed at. A real 404, not a simulated one. */
export function brokenEntryFor(remote: RemoteDescriptor): string {
  return new URL('./__fault-injected__/mf-manifest.json', absoluteEntry(remote.entry)).toString();
}

function absoluteEntry(entry: string): string {
  return new URL(entry, window.location.href).toString();
}
