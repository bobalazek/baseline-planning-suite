import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The ADRs make claims about the shape of the code. This file checks they are true, because a
 * boundary that is only described in a document is a boundary that has already been crossed.
 */
const REPO_ROOT = fileURLToPath(new URL('../../../..', import.meta.url)).replace(/\/$/, '');

const SOURCE_ROOTS = ['apps', 'packages'];
// `@mf-types` is emitted by the Module Federation DTS plugin from the remotes' exposes. It is a
// build artefact, not authored source, and it is generated with `any` in its fallback branches.
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  '.turbo',
  'coverage',
  '@mf-types',
]);

interface SourceFile {
  readonly path: string;
  readonly relativePath: string;
  readonly contents: string;
  /** Comments and string literals blanked out, so prose cannot trip a code rule. */
  readonly code: string;
  /** Comments blanked out, string literals kept — module specifiers live in strings. */
  readonly codeWithStrings: string;
}

/**
 * Blank out comments and string/template literals, preserving line structure so reported line
 * numbers stay correct. Without this, a comment containing the English word "any" fails the
 * "no `any`" rule, and the rule gets weakened until it stops meaning anything.
 */
function stripNonCode(contents: string): string {
  const blank = (match: string): string => match.replace(/[^\n]/g, ' ');

  return stripComments(contents)
    .replace(/`(?:\\.|[^`\\])*`/g, blank)
    .replace(/'(?:\\.|[^'\\\n])*'/g, blank)
    .replace(/"(?:\\.|[^"\\\n])*"/g, blank);
}

/** Blank comments only. Import specifiers are string literals, so they have to survive. */
function stripComments(contents: string): string {
  const blank = (match: string): string => match.replace(/[^\n]/g, ' ');

  return contents.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/\/\/[^\n]*/g, blank);
}

const SOURCE_FILES = collectSourceFiles();

function collectSourceFiles(): SourceFile[] {
  const files: SourceFile[] = [];

  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory)) {
      if (IGNORED_DIRECTORIES.has(entry)) {
        continue;
      }

      const path = join(directory, entry);

      if (statSync(path).isDirectory()) {
        visit(path);
      } else if (/\.(ts|tsx|mts)$/.test(entry)) {
        const contents = readFileSync(path, 'utf8');

        files.push({
          path,
          relativePath: path.slice(REPO_ROOT.length),
          contents,
          code: stripNonCode(contents),
          codeWithStrings: stripComments(contents),
        });
      }
    }
  };

  for (const root of SOURCE_ROOTS) {
    visit(join(REPO_ROOT, root));
  }

  return files;
}

function matching(predicate: (file: SourceFile) => boolean): SourceFile[] {
  return SOURCE_FILES.filter(predicate);
}

/** Scan real code, ignoring comments and string literals. For type-level rules such as `any`. */
function report(files: readonly SourceFile[], pattern: RegExp): string[] {
  return scan(files, pattern, (file) => file.code);
}

/** Scan code and string literals, ignoring comments. For import specifiers and field names. */
function reportWithStrings(files: readonly SourceFile[], pattern: RegExp): string[] {
  return scan(files, pattern, (file) => file.codeWithStrings);
}

function scan(
  files: readonly SourceFile[],
  pattern: RegExp,
  select: (file: SourceFile) => string
): string[] {
  const hits: string[] = [];

  for (const file of files) {
    const rawLines = file.contents.split('\n');

    select(file)
      .split('\n')
      .forEach((line, index) => {
        if (pattern.test(line)) {
          hits.push(`${file.relativePath}:${index + 1} → ${(rawLines[index] ?? line).trim()}`);
        }
      });
  }

  return hits;
}

/** This file necessarily contains the patterns it forbids, so it exempts itself by name. */
const OTHER_FILES = SOURCE_FILES.filter(
  (file) => !file.relativePath.endsWith('__tests__/boundaries.test.ts')
);

describe('the repository has source to check', () => {
  it('found the workspace', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(30);
  });
});

describe('TypeScript strict — no `any` (hard constraint)', () => {
  it('has no `any` type annotation anywhere', () => {
    // Type positions only: `: any`, `<any`, `as any`, `any[]`, `any>`, `| any`, `& any`.
    expect(
      report(SOURCE_FILES, /(?:[:<|&,([]\s*any\b)|(?:\bas\s+any\b)|(?:\bany\s*(?:\[\]|>))/)
    ).toEqual([]);
  });

  it('never disables the rule that forbids it', () => {
    // This one has to look at the raw text: an eslint-disable *is* a comment.
    const disables = OTHER_FILES.flatMap((file) =>
      file.contents
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /eslint-disable.*no-explicit-any/.test(line))
        .map(({ index }) => `${file.relativePath}:${index + 1}`)
    );

    expect(disables).toEqual([]);
  });

  it('never uses a non-null-asserting cast to dodge the type system in shipped code', () => {
    const shipped = OTHER_FILES.filter(
      (file) => !file.relativePath.includes('__tests__') && !file.relativePath.endsWith('.test.ts')
    );

    const suppressions = shipped.flatMap((file) =>
      file.contents
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /@ts-(ignore|expect-error|nocheck)/.test(line))
        .map(({ index }) => `${file.relativePath}:${index + 1}`)
    );

    expect(suppressions).toEqual([]);
  });
});

describe('ADR-0002 — rate records never leave People', () => {
  const deliverySources = matching(
    (file) =>
      file.relativePath.startsWith('/apps/delivery/') ||
      file.relativePath.startsWith('/packages/delivery-')
  );

  it('has Delivery sources to check', () => {
    expect(deliverySources.length).toBeGreaterThan(3);
  });

  it('mentions no hourly cost, rate record or effective date in Delivery', () => {
    expect(reportWithStrings(deliverySources, /hourlyCost|RateRecord|validFrom/)).toEqual([]);
  });

  it('does the pricing arithmetic in People, not Delivery', () => {
    const peopleDomain = matching((file) => file.relativePath.startsWith('/packages/people-domain/'));

    expect(reportWithStrings(peopleDomain, /blendedRate/).length).toBeGreaterThan(0);
  });
});

describe('ADR-0004 — the two teams meet only at a published contract', () => {
  const deliverySide = matching(
    (file) =>
      file.relativePath.startsWith('/apps/delivery') ||
      file.relativePath.startsWith('/packages/delivery-')
  );
  const peopleSide = matching(
    (file) =>
      file.relativePath.startsWith('/apps/people') ||
      file.relativePath.startsWith('/packages/people-')
  );

  it('never lets Delivery import People"s domain or app internals', () => {
    expect(reportWithStrings(deliverySide, /@repo\/people-domain|@repo\/people['"/]/)).toEqual([]);
  });

  it('never lets People import Delivery"s domain or app internals', () => {
    expect(reportWithStrings(peopleSide, /@repo\/delivery-domain|@repo\/delivery['"/]/)).toEqual([]);
  });

  it('does let each side import the other"s published contract', () => {
    expect(reportWithStrings(deliverySide, /@repo\/people-contracts/).length).toBeGreaterThan(0);
  });
});

describe('AGENTS.md — import hygiene', () => {
  it('never deep-imports another package"s source', () => {
    expect(reportWithStrings(OTHER_FILES, /from '@repo\/[a-z-]+\/src/)).toEqual([]);
  });

  it('never hides a cycle behind a dynamic first-party import', () => {
    expect(reportWithStrings(OTHER_FILES, /await import\('(@repo\/|\.)/)).toEqual([]);
  });
});
