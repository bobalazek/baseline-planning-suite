import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deliverySnapshotSchema, type DeliverySnapshot } from '@repo/delivery-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../env';
import { buildServer } from '../server';

const SEED_PATH = fileURLToPath(new URL('../../../../fixtures/baseline-seed.json', import.meta.url));

let env: Env;
let server: Awaited<ReturnType<typeof buildServer>>['server'];

async function start(): Promise<void> {
  ({ server } = await buildServer(env));
  await server.ready();
}

async function snapshot(): Promise<DeliverySnapshot> {
  return deliverySnapshotSchema.parse(
    (await server.inject({ method: 'GET', url: '/snapshot' })).json()
  );
}

beforeEach(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'delivery-api-'));

  env = {
    HOST: '127.0.0.1',
    PORT: 0,
    LOG_LEVEL: 'silent',
    DELIVERY_DATA_PATH: join(directory, 'delivery.json'),
    SEED_PATH,
  };

  await start();
});

afterEach(async () => {
  await server.close();
});

describe('GET /snapshot', () => {
  it('seeds Delivery"s slice of the fixture and nothing else', async () => {
    const plan = await snapshot();

    expect(plan.projects).toHaveLength(4);
    expect(plan.breakdownItems).toHaveLength(90);
    expect(plan.allocations).toHaveLength(720);
  });

  it('stamps seeded allocations so R5 has something to order by', async () => {
    const plan = await snapshot();

    expect(plan.allocations[0]?.updatedBy).toBe('seed');
    expect(plan.allocations[0]?.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never exposes rates — it does not have them (ADR-0002)', async () => {
    const raw = JSON.stringify((await server.inject({ method: 'GET', url: '/snapshot' })).json());

    expect(raw).not.toContain('hourlyCost');
    expect(raw).not.toContain('weeklyHours');
  });
});

describe('PUT /allocations (F6)', () => {
  const cell = {
    breakdownItemId: 'wbs-012',
    employeeId: 'emp-001',
    month: '2026-03',
    updatedBy: 'usr-1',
  };

  it('updates the reference cell in place, keeping its id', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: { ...cell, amount: 0.75 },
    });

    expect(response.json().allocation).toMatchObject({ id: 'alloc-001', amount: 0.75 });
  });

  it('records who edited it and when — R5 names the most recent edit', async () => {
    const before = new Date().toISOString();

    const response = await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: { ...cell, amount: 0.75 },
    });

    expect(response.json().allocation.updatedBy).toBe('usr-1');
    expect(response.json().allocation.updatedAt >= before).toBe(true);
  });

  it('creates a cell that did not exist', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: { ...cell, employeeId: 'emp-050', amount: 0.2 },
    });

    expect(response.json().allocation.id).toMatch(/^alloc-\d+$/);
    expect((await snapshot()).allocations).toHaveLength(721);
  });

  it('clears the cell on zero rather than storing an empty allocation', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: { ...cell, amount: 0 },
    });

    expect(response.json().allocation).toBeNull();
    expect((await snapshot()).allocations).toHaveLength(719);
  });

  it('flags over capacity but never blocks the edit (R5)', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: { ...cell, amount: 5 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().allocation.amount).toBe(5);
  });

  it('refuses to write to a work package that has children (R4)', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: { ...cell, breakdownItemId: 'wbs-001', amount: 0.5 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain('derived');
  });

  it('404s for a work package that does not exist', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: { ...cell, breakdownItemId: 'wbs-999', amount: 0.5 },
    });

    expect(response.statusCode).toBe(404);
  });

  it('400s on a month that is not YYYY-MM', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: { ...cell, month: '2026-3', amount: 0.5 },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /breakdown-items (F5, R4)', () => {
  it('creates a root work package', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/breakdown-items',
      payload: { projectId: 'prj-1', parentId: null, name: 'New stream' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ parentId: null, name: 'New stream' });
  });

  it('moves a leaf"s allocations onto the new child instead of losing them (R4)', async () => {
    const before = (await snapshot()).allocations.filter(
      (allocation) => allocation.breakdownItemId === 'wbs-012'
    );

    expect(before.length).toBeGreaterThan(0);

    const created = (
      await server.inject({
        method: 'POST',
        url: '/breakdown-items',
        payload: { projectId: 'prj-1', parentId: 'wbs-012', name: 'Phase one' },
      })
    ).json();

    const after = await snapshot();

    expect(after.allocations.filter((a) => a.breakdownItemId === 'wbs-012')).toHaveLength(0);
    expect(after.allocations.filter((a) => a.breakdownItemId === created.id)).toHaveLength(
      before.length
    );
    // Nothing was dropped on the way.
    expect(after.allocations).toHaveLength(720);
  });

  it('does not cap depth, so R4 stays reachable for the fixture"s level-three leaves', async () => {
    // wbs-012 is already the third level. If depth were capped at three, R4 could never fire for
    // any allocation in this fixture — every leaf that carries one is at that level.
    const child = (
      await server.inject({
        method: 'POST',
        url: '/breakdown-items',
        payload: { projectId: 'prj-1', parentId: 'wbs-012', name: 'Phase one' },
      })
    ).json();

    const grandchild = await server.inject({
      method: 'POST',
      url: '/breakdown-items',
      payload: { projectId: 'prj-1', parentId: child.id, name: 'Phase two' },
    });

    expect(grandchild.statusCode).toBe(201);
  });

  it('refuses a parent from another project', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/breakdown-items',
      payload: { projectId: 'prj-2', parentId: 'wbs-001', name: 'Wrong project' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('PATCH /breakdown-items/:id (F5)', () => {
  it('renames', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/breakdown-items/wbs-012',
      payload: { name: 'Design and discovery' },
    });

    expect(response.json().name).toBe('Design and discovery');
  });

  it('moves a work package to a legal parent', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/breakdown-items/wbs-012',
      payload: { parentId: null },
    });

    expect(response.json().parentId).toBeNull();
  });

  it('refuses a move that would create a cycle', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/breakdown-items/wbs-001',
      payload: { parentId: 'wbs-012' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.details.join(' ')).toContain('inside itself');
  });

  it('404s for an unknown work package', async () => {
    const response = await server.inject({
      method: 'PATCH',
      url: '/breakdown-items/wbs-999',
      payload: { name: 'Nope' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /breakdown-items/:id (F5)', () => {
  it('takes the subtree and everything allocated inside it', async () => {
    const before = await snapshot();
    const subtree = new Set(['wbs-004']);

    for (const item of before.breakdownItems) {
      if (item.parentId && subtree.has(item.parentId)) {
        subtree.add(item.id);
      }
    }

    const doomedAllocations = before.allocations.filter((allocation) =>
      subtree.has(allocation.breakdownItemId)
    );

    expect(doomedAllocations.length).toBeGreaterThan(0);
    expect((await server.inject({ method: 'DELETE', url: '/breakdown-items/wbs-004' })).statusCode).toBe(204);

    const after = await snapshot();

    expect(after.breakdownItems.filter((item) => subtree.has(item.id))).toHaveLength(0);
    expect(after.allocations).toHaveLength(before.allocations.length - doomedAllocations.length);
  });

  it('404s for an unknown work package', async () => {
    expect(
      (await server.inject({ method: 'DELETE', url: '/breakdown-items/wbs-999' })).statusCode
    ).toBe(404);
  });
});

describe('persistence', () => {
  it('survives a restart', async () => {
    await server.inject({
      method: 'PUT',
      url: '/allocations',
      payload: {
        breakdownItemId: 'wbs-012',
        employeeId: 'emp-001',
        month: '2026-03',
        amount: 0.42,
        updatedBy: 'usr-1',
      },
    });
    await server.close();
    await start();

    expect((await snapshot()).allocations.find((a) => a.id === 'alloc-001')?.amount).toBe(0.42);
  });
});

describe('GET /health', () => {
  it('names itself', async () => {
    expect((await server.inject({ method: 'GET', url: '/health' })).json()).toEqual({
      status: 'ok',
      service: 'delivery-api',
    });
  });
});
