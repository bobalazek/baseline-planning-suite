import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * The persistence port. A service depends on this interface, never on a file.
 *
 * `read` is synchronous over an in-memory copy because every page load hits the snapshot endpoint;
 * `update` is async and serialised because a write must reach disk before it is acknowledged.
 * Swapping the JSON file for SQLite means one more implementation of this interface.
 */
export interface DocumentStore<TDocument> {
  read(): TDocument;
  update(mutate: (current: TDocument) => TDocument): Promise<TDocument>;
}

/**
 * All the store needs of a schema. Typing it this way keeps `zod` out of the persistence port, so
 * a service could validate with anything and the store would not notice.
 */
export interface DocumentParser<TDocument> {
  parse(value: unknown): TDocument;
}

export interface JsonDocumentStoreOptions<TDocument> {
  readonly filePath: string;
  readonly schema: DocumentParser<TDocument>;
  /** Called only when the file does not exist yet. */
  readonly seed: () => TDocument | Promise<TDocument>;
  readonly onSeeded?: (document: TDocument) => void;
}

export async function createJsonDocumentStore<TDocument>(
  options: JsonDocumentStoreOptions<TDocument>
): Promise<DocumentStore<TDocument>> {
  let document = (await loadOrSeed(options)).document;
  // Writes are chained rather than fired in parallel: two concurrent read-modify-write cycles over
  // the same file is how one of them silently disappears.
  let pendingWrite: Promise<unknown> = Promise.resolve();

  return {
    read: () => document,

    update(mutate) {
      // Built with the Promise constructor rather than returned from `.then`, because for an
      // unconstrained generic TypeScript widens a chained result to `Promise<Awaited<TDocument>>`.
      return new Promise<TDocument>((resolve, reject) => {
        pendingWrite = pendingWrite.then(async () => {
          try {
            const updated = options.schema.parse(mutate(document));

            await writeAtomically(options.filePath, updated);
            document = updated;
            resolve(updated);
          } catch (error) {
            // Rejecting the caller without breaking the chain: one bad request must not wedge
            // every write that comes after it.
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
      });
    },
  };
}

async function loadOrSeed<TDocument>(
  options: JsonDocumentStoreOptions<TDocument>
): Promise<{ document: TDocument }> {
  const existing = await readExisting(options);

  if (existing) {
    return existing;
  }

  const seeded = options.schema.parse(await options.seed());

  await writeAtomically(options.filePath, seeded);
  options.onSeeded?.(seeded);

  return { document: seeded };
}

async function readExisting<TDocument>(
  options: JsonDocumentStoreOptions<TDocument>
): Promise<{ document: TDocument } | null> {
  try {
    const raw = await readFile(options.filePath, 'utf8');

    return { document: options.schema.parse(JSON.parse(raw)) };
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * Write to a sibling temp file and rename over the target. `rename` within a directory is atomic,
 * so a container killed mid-write leaves the previous plan intact rather than a truncated one.
 */
async function writeAtomically(filePath: string, document: unknown): Promise<void> {
  const directory = dirname(filePath);

  await mkdir(directory, { recursive: true });

  const temporaryPath = join(directory, `.${process.pid}-${Date.now()}-${counter++}.tmp`);

  await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

let counter = 0;
