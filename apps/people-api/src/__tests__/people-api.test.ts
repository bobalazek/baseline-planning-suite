import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { peopleSnapshotSchema } from '@repo/people-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../env';
import { buildServer } from '../server';

const SEED_PATH = fileURLToPath(
  new URL('../../../../fixtures/baseline-seed.json', import.meta.url)
);

let env: Env;
let server: Awaited<ReturnType<typeof buildServer>>['server'];

async function start(): Promise<void> {
  ({ server } = await buildServer(env));
  await server.ready();
}

beforeEach(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'people-api-'));

  env = {
    HOST: '127.0.0.1',
    PORT: 0,
    LOG_LEVEL: 'silent',
    PEOPLE_DATA_PATH: join(directory, 'people.json'),
    SEED_PATH,
  };

  await start();
});

afterEach(async () => {
  await server.close();
});

describe('GET /snapshot', () => {
  it('seeds People"s slice of the fixture and nothing else', async () => {
    const response = await server.inject({ method: 'GET', url: '/snapshot' });
    const body: unknown = response.json();

    expect(response.statusCode).toBe(200);

    const snapshot = peopleSnapshotSchema.parse(body);

    expect(snapshot.employees).toHaveLength(60);
    expect(snapshot.rateRecords).toHaveLength(150);
    expect(Object.keys(body as object)).toEqual(['employees', 'rateRecords']);
  });

  it('never exposes the plan — Delivery"s collections are not in People"s store', async () => {
    const body = server.inject({ method: 'GET', url: '/snapshot' });

    expect(JSON.stringify((await body).json())).not.toContain('breakdownItem');
  });
});

describe('POST /rate-records (F4)', () => {
  it('adds a rate and gives it an id', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/rate-records',
      payload: { employeeId: 'emp-001', validFrom: '2026-09-01', hourlyCost: 105 },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ employeeId: 'emp-001', hourlyCost: 105 });
    expect(response.json().id).toMatch(/^rate-\d+$/);
  });

  it('accepts a retroactive rate — R1 allows editing the past', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/rate-records',
      payload: { employeeId: 'emp-001', validFrom: '2024-01-01', hourlyCost: 70 },
    });

    expect(response.statusCode).toBe(201);
  });

  it('refuses a second rate starting on a day the employee already has one', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/rate-records',
      payload: { employeeId: 'emp-001', validFrom: '2026-03-12', hourlyCost: 120 },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toContain('2026-03-12');
  });

  it('404s for an employee who does not exist', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/rate-records',
      payload: { employeeId: 'emp-999', validFrom: '2026-09-01', hourlyCost: 105 },
    });

    expect(response.statusCode).toBe(404);
  });

  it('400s on a malformed payload, naming the field', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/rate-records',
      payload: { employeeId: 'emp-001', validFrom: '01/09/2026', hourlyCost: 105 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.details.join(' ')).toContain('validFrom');
  });

  it('400s on a negative hourly cost', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/rate-records',
      payload: { employeeId: 'emp-001', validFrom: '2026-09-01', hourlyCost: -1 },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('PATCH /rate-records/:id (F4)', () => {
  it('corrects an hourly cost, leaving the date alone', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/rate-records/rate-002',
      payload: { hourlyCost: 99 },
    });

    expect(response.json()).toMatchObject({ validFrom: '2026-03-12', hourlyCost: 99 });
  });

  it('moves a rate to a different day', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/rate-records/rate-002',
      payload: { validFrom: '2026-03-20' },
    });

    expect(response.json().validFrom).toBe('2026-03-20');
  });

  it('refuses a move onto a day the same employee already has', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/rate-records/rate-002',
      payload: { validFrom: '2025-01-01' },
    });

    expect(response.statusCode).toBe(409);
  });

  it('404s for a rate record that does not exist', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/rate-records/rate-999',
      payload: { hourlyCost: 1 },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /rate-records/:id (F4)', () => {
  it('removes the rate', async () => {
    expect(
      (await server.inject({ method: 'DELETE', url: '/rate-records/rate-002' })).statusCode
    ).toBe(204);

    const snapshot = peopleSnapshotSchema.parse(
      (await server.inject({ method: 'GET', url: '/snapshot' })).json()
    );

    expect(snapshot.rateRecords.some((record) => record.id === 'rate-002')).toBe(false);
  });

  it('404s twice — deletion is not idempotent by accident', async () => {
    await server.inject({ method: 'DELETE', url: '/rate-records/rate-002' });

    expect(
      (await server.inject({ method: 'DELETE', url: '/rate-records/rate-002' })).statusCode
    ).toBe(404);
  });
});

describe('persistence', () => {
  it('survives a restart — the edit is on disk, not in memory', async () => {
    await server.inject({
      method: 'PATCH',
      url: '/rate-records/rate-002',
      payload: { hourlyCost: 123 },
    });
    await server.close();
    await start();

    const snapshot = peopleSnapshotSchema.parse(
      (await server.inject({ method: 'GET', url: '/snapshot' })).json()
    );

    expect(snapshot.rateRecords.find((record) => record.id === 'rate-002')?.hourlyCost).toBe(123);
  });
});

describe('GET /health', () => {
  it('names itself, so a compose healthcheck cannot pass against the wrong container', async () => {
    expect((await server.inject({ method: 'GET', url: '/health' })).json()).toEqual({
      status: 'ok',
      service: 'people-api',
    });
  });
});
