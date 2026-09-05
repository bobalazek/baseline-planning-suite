import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createJsonDocumentStore, loadEnv } from '../index';

const schema = z.object({ items: z.array(z.object({ id: z.string(), amount: z.number() })) });

type Document = z.infer<typeof schema>;

const SEED: Document = { items: [{ id: 'a', amount: 1 }] };

let directory: string;

async function storeIn(fileName = 'store.json', seed: () => Document = () => SEED) {
  directory = await mkdtemp(join(tmpdir(), 'baseline-store-'));

  return {
    path: join(directory, fileName),
    store: await createJsonDocumentStore({ filePath: join(directory, fileName), schema, seed }),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createJsonDocumentStore', () => {
  it('seeds on first boot and writes the seed to disk', async () => {
    const { path, store } = await storeIn();

    expect(store.read()).toEqual(SEED);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(SEED);
  });

  it('does not re-seed when the file already exists — edits survive a restart', async () => {
    const { path, store } = await storeIn();

    await store.update((current) => ({ items: [...current.items, { id: 'b', amount: 2 }] }));

    const reopened = await createJsonDocumentStore({
      filePath: path,
      schema,
      seed: () => SEED,
    });

    expect(reopened.read().items).toHaveLength(2);
  });

  it('rejects a stored document that no longer matches the schema', async () => {
    const { path } = await storeIn();

    await writeFile(path, JSON.stringify({ items: [{ id: 'a', amount: 'not a number' }] }), 'utf8');

    await expect(
      createJsonDocumentStore({ filePath: path, schema, seed: () => SEED })
    ).rejects.toThrow();
  });

  it('serialises concurrent updates instead of losing one', async () => {
    const { store } = await storeIn();

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        store.update((current) => ({
          items: [...current.items, { id: `n-${index}`, amount: index }],
        }))
      )
    );

    expect(store.read().items).toHaveLength(21);
  });

  it('leaves no temp files behind', async () => {
    const { store } = await storeIn();

    await store.update((current) => ({ items: [...current.items, { id: 'b', amount: 2 }] }));

    expect((await readdir(directory)).filter((entry) => entry.endsWith('.tmp'))).toEqual([]);
  });

  it('keeps serving the last good document when an update is rejected', async () => {
    const { store } = await storeIn();

    await expect(
      store.update(() => ({ items: [{ id: 'bad', amount: 'nope' }] }) as unknown as Document)
    ).rejects.toThrow();

    expect(store.read()).toEqual(SEED);
  });

  it('accepts later writes after a rejected one — a bad request cannot wedge the store', async () => {
    const { store } = await storeIn();

    await store
      .update(() => ({ items: [{ id: 'bad', amount: 'nope' }] }) as unknown as Document)
      .catch(() => undefined);

    await store.update((current) => ({ items: [...current.items, { id: 'c', amount: 3 }] }));

    expect(store.read().items.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('creates the directory when it does not exist', async () => {
    directory = await mkdtemp(join(tmpdir(), 'baseline-store-'));

    const nested = join(directory, 'deep', 'nested', 'store.json');
    const store = await createJsonDocumentStore({ filePath: nested, schema, seed: () => SEED });

    expect(store.read()).toEqual(SEED);
    expect(JSON.parse(await readFile(nested, 'utf8'))).toEqual(SEED);
  });
});

describe('loadEnv', () => {
  it('reports every missing variable at once, by name', () => {
    const envSchema = z.object({
      BASELINE_MISSING_ONE: z.string(),
      BASELINE_MISSING_TWO: z.string(),
    });

    expect(() => loadEnv(envSchema)).toThrow(/BASELINE_MISSING_ONE[\s\S]*BASELINE_MISSING_TWO/);
  });

  it('returns the parsed environment when it is valid', () => {
    vi.stubEnv('BASELINE_TEST_PORT', '3001');

    expect(loadEnv(z.object({ BASELINE_TEST_PORT: z.string() })).BASELINE_TEST_PORT).toBe('3001');

    vi.unstubAllEnvs();
  });
});
