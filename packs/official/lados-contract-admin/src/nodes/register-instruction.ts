/**
 * lados.contract.register_instruction — Phase 21 S6.1 (remaining Wave 4)
 *
 * Creates a contract instruction Workspace Resource (`lados_resources`
 * type `contract_instruction`, new — migration
 * 0060_contract_admin_resource_types.sql). Registers a record only; it
 * does not determine entitlement or valuation.
 *
 * Config/Inputs:
 *   instruction.instructionDate, issuer, reference — required
 *   summary — optional
 *
 * Outputs:
 *   entry — { instructionId, reference, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function registerInstruction(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { entry: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const instructionInput = (inp['instruction'] as Record<string, unknown> | undefined) ?? {};

  const instructionDate = (instructionInput['instructionDate'] ?? cfg['instructionDate']) as string | undefined;
  const issuer = (instructionInput['issuer'] ?? cfg['issuer']) as string | undefined;
  const reference = (instructionInput['reference'] ?? cfg['reference']) as string | undefined;
  const summary = (instructionInput['summary'] ?? cfg['summary']) as string | undefined;

  if (!instructionDate) {
    return {
      status: 'failure',
      outputs: { entry: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.register_instruction: instructionDate is required' },
    };
  }
  if (!issuer) {
    return {
      status: 'failure',
      outputs: { entry: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.register_instruction: issuer is required' },
    };
  }
  if (!reference) {
    return {
      status: 'failure',
      outputs: { entry: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.register_instruction: reference is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { entry: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.contract.register_instruction: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.contract.register_instruction → ${reference} issued by ${issuer}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'contract_instruction',
    name: `Instruction — ${reference}`,
    data: { instructionDate, issuer, reference, summary: summary ?? null },
    createdBy: actorId,
    initialState: 'registered',
  });

  return {
    status: 'success',
    outputs: { entry: { instructionId: record.id, reference, status: record.state } },
    summary: `Instruction registered: ${reference}`,
  };
}
