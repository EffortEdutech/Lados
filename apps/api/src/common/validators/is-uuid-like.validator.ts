/**
 * IsUuidLike — Phase 22 S22.2 bugfix (2026-07-06)
 *
 * class-validator's built-in `@IsUUID()` delegates to validator.js's
 * `isUUID()`, whose default ('all') pattern requires RFC 4122 version/variant
 * nibbles: `xxxxxxxx-xxxx-Vxxx-Nxxx-xxxxxxxxxxxx` where V must be [1-8] and
 * N must be [89ab]. Postgres's own `uuid` column type does NOT enforce
 * this — it accepts any 128-bit value in the 8-4-4-4-12 hex shape,
 * version/variant nibbles or not.
 *
 * This test environment's seed data uses deliberately memorable fixture IDs
 * like `dddddddd-0001-0000-0000-000000000002` (version nibble '0', variant
 * nibble '0') — valid `uuid` column values, but ones `@IsUUID()` silently
 * rejects. Found 2026-07-06 when this blocked `ApprovalService.delegate()`'s
 * `toUserId` field with an opaque "toUserId must be a UUID" error; the same
 * class of bug existed on every other `@IsUUID()` field in this codebase
 * (departments, resources, resource bindings, event-bus subscriptions,
 * project.departmentId) — any of them would have broken identically the
 * moment a real request touched one of these test IDs.
 *
 * Use this everywhere a UUID-shaped identifier is validated instead of
 * class-validator's `@IsUUID()`, so validation reflects what the database
 * actually accepts rather than an RFC 4122 subset real Supabase-generated
 * IDs happen to satisfy but hand-seeded fixture IDs may not.
 */
import { registerDecorator, ValidationOptions } from 'class-validator';

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function IsUuidLike(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isUuidLike',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && UUID_LIKE.test(value);
        },
        defaultMessage(): string {
          return `${propertyName} must be a UUID`;
        },
      },
    });
  };
}
