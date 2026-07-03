/**
 * @lados/pack-sdk (V2)
 *
 * LADOS V4 Pack SDK — types, interfaces, and utilities for building
 * first-party and third-party @lados node packs.
 *
 * V2 additions over V1:
 *   - InstallConfigField       — admin config shown during pack installation
 *   - StateMachineDecl         — declares resource state machines
 *   - ResourceSchemaDecl       — JSON Schema for resource data fields
 *   - EventSchemaDecl          — event type + payload schema declarations
 *   - NodeResolverFn           — standard resolver function type
 *   - PackResolverFactory      — typed factory pattern for resolveNode()
 *
 * All V1 types (PackManifest, PackPermission, PackNodeRegistration, …) are
 * preserved as a strict superset — existing packs compile without changes.
 */

export const PACK_SDK_VERSION = '2.0.0' as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type {
  // V1 compat
  PackPermissionScope,
  PackPermission,
  ResourceInlineAction,
  ResourceListViewConfig,
  ResourceViewConfig,
  PackResourceDefinition,
  PackManifest,
  PackNodeRegistration,
  PackValidationIssue,
  PackValidationResult,
  // V2 new
  InstallConfigFieldType,
  InstallConfigFieldOption,
  InstallConfigField,
  StateMachineState,
  StateMachineTransition,
  StateMachineDecl,
  ResourceSchemaDecl,
  EventSchemaDecl,
  OfficialAiBoundary,
  OfficialCapabilityPackContractVersion,
  OfficialCapabilityPackLayer,
  OfficialCapabilityPackManifest,
  OfficialCapabilityPackStatus,
  OfficialCompatibilityAlias,
  OfficialExecutorStatus,
  OfficialInputPattern,
  OfficialKnowledgePackRequirements,
  OfficialNodeCanvasUx,
  OfficialNodeConfigGroup,
  OfficialNodeEventEmission,
  OfficialNodeManifest,
  OfficialNodePort,
  OfficialNodePorts,
  OfficialNodeResourceBindingContract,
  OfficialPackSkeleton,
  OfficialRuntimeStatus,
  OfficialVerificationStatus,
} from './types';

// ── Resolver types ────────────────────────────────────────────────────────────

export type {
  NodeExecutor,
  NodeResolverFn,
  PackResolverFactory,
} from './resolve';

// ── Phase 20B official compatibility aliases ───────────────────────────────

export {
  officialCompatibilityAliases,
  resolveOfficialCompatibilityAlias,
} from './compatibility-aliases';

// ── Validation ────────────────────────────────────────────────────────────────

export {
  assertOfficialCapabilityPackManifest,
  assertOfficialNodeManifests,
  assertPackManifest,
  validateOfficialCapabilityPackManifest,
  validateOfficialNodeManifests,
  validatePackManifest,
} from './validate';
