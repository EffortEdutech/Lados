/**
 * @qsos/pack-sdk
 *
 * Base types and validation for QS-OS packs.
 * Sprint 5 (S5-002) — full implementation.
 */

export const PACK_SDK_VERSION = '1.0.0' as const;

export type {
  PackManifest,
  PackPermissionScope,
  PackPermission,
  PackNodeRegistration,
  PackValidationIssue,
  PackValidationResult,
} from './types';

export { validatePackManifest, assertPackManifest } from './validate';
