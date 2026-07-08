/**
 * IsUuidLike — Phase 22 S22.2 bugfix (2026-07-06)
 *
 * Regression test for the "toUserId must be a UUID" bug: class-validator's
 * built-in @IsUUID() rejects this environment's seed-data fixture IDs
 * (e.g. `dddddddd-0001-0000-0000-000000000002`) because they don't carry
 * RFC 4122 version/variant nibbles, even though they're perfectly valid
 * Postgres `uuid` column values. IsUuidLike() should accept exactly what
 * the database accepts.
 */
import { validate } from 'class-validator';
import { IsUuidLike } from '../src/common/validators/is-uuid-like.validator';

class Fixture {
  @IsUuidLike()
  value!: string;
}

async function errorsFor(value: unknown): Promise<number> {
  const instance = new Fixture();
  (instance as unknown as Record<string, unknown>)['value'] = value;
  const errors = await validate(instance);
  return errors.length;
}

describe('IsUuidLike', () => {
  it('accepts a real Supabase-generated v4 UUID', async () => {
    expect(await errorsFor('550e8400-e29b-41d4-a716-446655440000')).toBe(0);
  });

  it('accepts this environment\'s non-RFC-4122 fixture IDs (the bug this fixes)', async () => {
    expect(await errorsFor('dddddddd-0001-0000-0000-000000000002')).toBe(0);
    expect(await errorsFor('eeeeeeee-0001-0000-0000-000000000001')).toBe(0);
  });

  it('rejects a non-UUID-shaped string', async () => {
    expect(await errorsFor('not-a-uuid')).toBeGreaterThan(0);
  });

  it('rejects a value that is not even a string', async () => {
    expect(await errorsFor(12345)).toBeGreaterThan(0);
  });

  it('rejects an empty string', async () => {
    expect(await errorsFor('')).toBeGreaterThan(0);
  });
});
