/**
 * Branded ID types — prevents accidentally passing a ProjectId where an
 * OrganizationId is expected at compile time while keeping runtime cost zero.
 *
 * Usage:
 *   const id = 'abc-123' as OrganizationId;
 */

declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };
type Branded<T, B> = T & Brand<B>;

export type OrganizationId = Branded<string, 'OrganizationId'>;
export type ProjectId = Branded<string, 'ProjectId'>;
export type WorkflowId = Branded<string, 'WorkflowId'>;
export type WorkflowVersionId = Branded<string, 'WorkflowVersionId'>;
export type NodeInstanceId = Branded<string, 'NodeInstanceId'>;
export type ExecutionId = Branded<string, 'ExecutionId'>;
export type UserId = Branded<string, 'UserId'>;
export type DocumentId = Branded<string, 'DocumentId'>;
export type PackId = Branded<string, 'PackId'>;
export type NodeTypeId = Branded<string, 'NodeTypeId'>;

/**
 * Cast a plain string to a branded ID.
 * Use only at system boundaries (DB reads, API inputs) — never in domain logic.
 */
export function asId<T extends Branded<string, unknown>>(raw: string): T {
  return raw as T;
}
