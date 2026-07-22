/**
 * Real node resolver for NestJS execution context.
 *
 * Phase 2: node implementations moved into their packs.
 * Phase 3: ResourceService added — resource.* nodes now live in core-pack.
 * Phase 4: EventBusService added — event.publish node now live in core-pack.
 * Phase 5: StateEngineService added — state.change node now live in core-pack.
 * Phase 7: FoundationPack added — foundation.* nodes (notification, approval, assign_user).
 * Phase 9: ContractorPack added — contractor.* nodes (job, trip, fuel, invoice).
 * Phase 10: NotificationsPack added — notification.send_email / send_sms / send_in_app.
 *
 * This file is a thin integration layer — it injects NestJS services
 * into each pack's resolveNode() factory and chains the results.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { FileService }         from '../../file/file.service';
import type { LibraryService }      from '../../library/library.service';
import type { AiService }           from '../../ai/ai.service';
import type { DocumentService }     from '../../document/document.service';
import type { NotificationService } from '../../notification/notification.service';
import type { ResourceService }     from '../../resource/resource.service';
import type { EventBusService }     from '../../event-bus/event-bus.service';
import type { StateEngineService }  from '../../state-engine/state-engine.service';
import type { ApprovalTaskCreator } from '../../approval/approval-task.creator';
import type { ArtifactService }     from '../../artifact/artifact.service';
import type { EmailService }        from '../../notification/email.service';   // Phase 10
import type { SmsService }          from '../../notification/sms.service';     // Phase 10
import type { ProgramArtifactService } from '../../program-artifact/program-artifact.service'; // Phase 23 S23.3, renamed Phase 24 S24.2
import type { ReligiousSourceService } from '../../religious-source/religious-source.service'; // Phase B (QMCP)
import type { CurrentIssueResearchService } from '../../current-issue-research/current-issue-research.service'; // Phase D (QMCP)

// Phase 21 S2 (Wave 1) — official Capability Pack executors. Tried first —
// these are the canonical successors declared in the compatibility alias
// map (packages/@lados/pack-sdk/src/compatibility-aliases.ts) and should
// take priority over the prototype nodes they alias/merge.
import { resolveNode as officialWorkflowFoundationResolve } from '@lados/official-workflow-foundation';
import { resolveNode as officialHumanWorkResolve }          from '@lados/official-human-work';
import { resolveNode as officialDocumentIntelligenceResolve } from '@lados/official-document-intelligence';

// Phase 21 S4 (Wave 2) — official Capability Pack executors.
import { resolveNode as officialResourceOperationsResolve } from '@lados/official-resource-operations';
import { resolveNode as officialTaskCaseResolve }           from '@lados/official-task-case';
import { resolveNode as officialCommunicationResolve }      from '@lados/official-communication';

// Phase 21 S5 (Wave 3) — official Capability Pack executors.
import { resolveNode as officialCommercialFinanceResolve } from '@lados/official-commercial-finance';
import { resolveNode as officialProcurementResolve }       from '@lados/official-procurement';

// Phase 21 S6 (Wave 4) — official Capability Pack executors.
import { resolveNode as officialQsCommercialResolve }           from '@lados/official-qs-commercial';
import { resolveNode as officialConstructionOperationsResolve } from '@lados/official-construction-operations';

// Phase 21 S6.1 (remaining Wave 4, pulled forward from Phase 22 deferral) —
// official Capability Pack executors.
import { resolveNode as officialContractAdminResolve } from '@lados/official-contract-admin';
import { resolveNode as officialAssetFleetResolve }     from '@lados/official-asset-fleet';
import { resolveNode as officialPeoplePayrollResolve }  from '@lados/official-people-payroll';

// New official Capability Pack — Content Production line of business
// (built outside the Phase 21 QS/construction/procurement Wave program).
// Orchestrates and validates the Claude + Remotion motion-graphics
// production workflow; render_scenes is a stub (no render backend wired).
import { resolveNode as officialVideoProductionResolve } from '@lados/official-video-production';

// Quran Media Creator Pack (QMCP, Content Production line of business).
// Phase A shipped 13 honest-stub executors; Phase B/C/D wired real logic
// against ReligiousSourceService (QUL/Semak Hadis), AiService, and
// CurrentIssueResearchService (allowlisted RSS/news) — see
// test-data/LADOS_Quran_Media_Creator_Pack_QMCP_Volume2_Node_Contracts_V1.0.md.
// discover_current_issues degrades to RESEARCH_SERVICE_NOT_CONFIGURED
// whenever no approved source is actually registered
// (CURRENT_ISSUE_RESEARCH_SOURCES) — same honest-stub posture as an
// unconfigured LADOS_RELIGIOUS_DATA_PATH.
import { resolveNode as officialQuranMediaResolve } from '@lados/official-quran-media';

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

// ── Main resolver factory ─────────────────────────────────────────────────────
//
// Phase 21 S9 (prototype-pack removal, 2026-07-04): the legacy prototype
// resolvers (core/foundation/qs/document/procurement/contractor/construction/
// finance/notifications-pack) and their adapter functions were removed here.
// Every node type they resolved has a canonical official-pack successor
// already wired above (per the compatibility alias map,
// packages/@lados/pack-sdk/src/compatibility-aliases.ts), and zero live
// workflows/templates reference any prototype node type as of migration
// 0064 (confirmed via live query). The prototype pack SOURCE is preserved,
// unbuilt, under archived/packs/ — see docs/Lados/V4/Sprint/
// Lados_V4_Phase21_Checklist.md Handover 2026-07-04 (8).

/**
 * Build the real node resolver, injecting NestJS services.
 * Call this once in ExecutionService and pass to WorkflowRunner.
 *
 * Each pack resolver is tried in order; the first non-null match wins.
 * Returns null when unresolved. WorkflowRunner applies its explicit execution
 * mode policy; production-strict fails with EXECUTOR_NOT_AVAILABLE.
 */
export function buildRealNodeResolver(
  fileService: FileService,
  libraryService: LibraryService,
  aiService: AiService,
  documentService?: DocumentService,
  notificationService?: NotificationService,
  resourceService?: ResourceService,
  eventBusService?: EventBusService,
  stateEngineService?: StateEngineService,
  approvalService?: ApprovalTaskCreator,
  artifactService?: ArtifactService,
  emailService?: EmailService,        // Phase 10
  smsService?: SmsService,            // Phase 10
  programArtifactService?: ProgramArtifactService, // Phase 23 S23.3, renamed Phase 24 S24.2
  religiousSourceService?: ReligiousSourceService, // Phase B (QMCP)
  currentIssueResearchService?: CurrentIssueResearchService, // Phase D (QMCP)
): (nodeType: string) => NodeExecutor | null {
  // ArtifactService satisfies both IArtifactWriteService and IArtifactReadService structurally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const artifactAdapter = artifactService as any;

  const resolvers = [
    // Phase 21 S2 (Wave 1) — official Capability Packs first. Canonical
    // successors take priority over every prototype pack below, including
    // Foundation Pack (per the compatibility alias map: core.human_approval
    // and foundation.request_approval both merge into
    // lados.human.request_approval, etc.).
    // Phase 21 S9.1 (gap closure) — lados.workflow.publish_event needs
    // EventBusService; every other node in this pack is self-contained.
    // Phase 24 S24.3: lados-workflow-foundation's WorkflowFoundationServices
    // interface field renamed pipelineArtifactService→programArtifactService
    // to match — the S24.2 explicit-remap exception is gone, plain shorthand
    // now that both sides agree on the name.
    officialWorkflowFoundationResolve({ eventBusService, programArtifactService }),
    officialHumanWorkResolve({
      approvalTaskService: approvalService,
      notificationService,
      resourceService,
    }),
    officialDocumentIntelligenceResolve({
      fileService,
      libraryService,
      documentService,
      // No storage service implements IDocumentStorageService yet —
      // generate_document falls back to returning the file inline.
    }),
    // Phase 21 S4 (Wave 2) — Resource Operations (L0). ResourceService
    // satisfies create/read/list/update/transition all at once via
    // structural typing; ArtifactService satisfies both artifact interfaces.
    // Cast needed: ResourceService's `type`/`state` params are narrowed to
    // its own ResourceType/DEFAULT_STATE union, while the official pack's
    // interfaces intentionally accept any string (same class of cast as
    // core-pack's resourceService below — the runtime shape is compatible,
    // only the TS union differs).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialResourceOperationsResolve({
      createService: resourceService as any,
      readService: resourceService,
      listService: resourceService as any,
      updateService: resourceService,
      transitionService: resourceService,
      artifactWriteService: artifactService,
      artifactReadService: artifactService,
      // Phase 21 S9.1 (gap closure) — lados.resource.assign reuses the same
      // ResourceService.updateResource() call as lados.resource.update.
      assignService: resourceService,
    }),
    // Phase 21 S4 (Wave 2) — Task/Case Management (L1). Tasks/Cases are
    // Workspace Resources (type "task"/"case") — same ResourceService.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialTaskCaseResolve({
      createService: resourceService as any,
      updateService: resourceService,
      transitionService: resourceService,
    }),
    // Phase 21 S4 (Wave 2) — Communication (L1). send_sms is a stub
    // (executorStatus:"stub") until a real SMS provider is wired into
    // SmsService — see packs/official/lados-communication/src/nodes/send-sms.ts.
    officialCommunicationResolve({
      emailService,
      smsService,
      notificationService,
    }),
    // Phase 21 S5 (Wave 3) — Commercial Finance (L1). Invoices, purchase
    // orders, and retention releases are Workspace Resources — same
    // ResourceService as Resource Operations/Task-Case above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialCommercialFinanceResolve({
      createService: resourceService as any,
      readService: resourceService,
      updateService: resourceService,
      transitionService: resourceService,
    }),
    // Phase 21 S5 (Wave 3) — Procurement (L1). RFQs, quotations, and PO
    // requests are Workspace Resources (migration
    // 0058_procurement_resource_types.sql). compare_quotations and
    // recommend_award are pure computations — no service needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialProcurementResolve({
      createService: resourceService as any,
      transitionService: resourceService,
    }),
    // Phase 21 S6 (Wave 4) — QS Commercial (L2). BOQs, progress claims,
    // and variations are Workspace Resources reusing migration
    // 0041_construction_resources.sql's boq/progress_claim/variation
    // types. split_work_packages/value_variation/reconcile_final_account/
    // classify_trade are deterministic advisory computations — no AI
    // service needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialQsCommercialResolve({
      createService: resourceService as any,
      readService: resourceService,
    }),
    // Phase 21 S6 (Wave 4) — Construction Operations (L2). Projects, site
    // inspections, and defects reuse migration
    // 0041_construction_resources.sql's types; site diaries use the new
    // site_diary type (migration
    // 0059_construction_site_diary_resource_type.sql). run_handover_checklist
    // is a pure computation — no service needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialConstructionOperationsResolve({
      createService: resourceService as any,
      updateService: resourceService,
      transitionService: resourceService,
    }),
    // Phase 21 S6.1 (remaining Wave 4) — Contract Admin (L2). Instructions
    // and notices use the new contract_instruction/contract_notice types
    // (migration 0060_contract_admin_resource_types.sql).
    // lookup_clause_reference is a deterministic keyword match — no
    // service needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialContractAdminResolve({
      createService: resourceService as any,
      updateService: resourceService,
    }),
    // Phase 21 S6.1 (remaining Wave 4) — Asset and Fleet (L2). Jobs,
    // trips, fuel receipts, and maintenance records reuse migration
    // 0032_phase9_contractor_edition.sql's types (same as Contractor
    // Edition). extract_fuel_receipt reuses the real, already-integrated
    // AiService.isConfigured/runVision (same capability contractor-pack's
    // real contractor.extract_fuel_data node uses) — honest reuse, not a
    // new capability.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialAssetFleetResolve({
      createService: resourceService as any,
      readService: resourceService,
      updateService: resourceService,
      transitionService: resourceService,
      aiService,
    }),
    // Phase 21 S6.1 (remaining Wave 4) — People and Payroll (L2). Payroll
    // runs and expenses reuse migrations 0032/0034's types. Both approval
    // nodes enforce the MISSING_HUMAN_DECISION contract on approvedBy.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialPeoplePayrollResolve({
      createService: resourceService as any,
      readService: resourceService,
      updateService: resourceService,
    }),
    // Video Production (L2) — Content Production line of business. Reuses
    // the existing FileService for read_script/insert_images; renderService
    // is intentionally left unpassed (undefined) since no NestJS service
    // implements it yet — render_scenes degrades to an honest
    // RENDER_BACKEND_NOT_CONFIGURED failure, same pattern as
    // document-intelligence's unpassed storageService above.
    officialVideoProductionResolve({ fileService }),
    // Quran Media Creator (L2) — Content Production line of business.
    // quranSourceService/hadithVerificationService are the SAME
    // ReligiousSourceService instance (it structurally satisfies both pack
    // interfaces — Blueprint §9.1); passed as `undefined` when no QUL
    // dataset is configured so the pack's own honest stubs degrade to
    // RELIGIOUS_DATA_PATH_NOT_CONFIGURED/TAFSIR_NOT_CONFIGURED rather than
    // this file silently swallowing the "not configured" signal.
    // Hadith verification needs no dataset path, so it is always passed
    // through when the service exists at all. currentIssueResearchService
    // (Phase D) follows the same isConfigured gate as quranSourceService —
    // undefined until at least one approved RSS source is registered
    // (CURRENT_ISSUE_RESEARCH_SOURCES), so discover_current_issues degrades
    // to RESEARCH_SERVICE_NOT_CONFIGURED rather than this file silently
    // swallowing the "not configured" signal.
    officialQuranMediaResolve({
      aiService,
      quranSourceService: religiousSourceService?.isConfigured ? religiousSourceService : undefined,
      hadithVerificationService: religiousSourceService,
      currentIssueResearchService: currentIssueResearchService?.isConfigured ? currentIssueResearchService : undefined,
    }),
  ];

  return (nodeType: string) => {
    for (const resolver of resolvers) {
      const fn = resolver(nodeType);
      if (fn) return fn;
    }
    return null;
  };
}
