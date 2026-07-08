/**
 * lados.asset_fleet.extract_fuel_receipt — Phase 21 S6.1 (remaining Wave 4)
 *
 * Uses GPT-4o vision (via the same already-integrated IAiVisionService
 * shape as contractor-pack's real contractor.extract_fuel_data node —
 * read for reference only, never imported) to extract fields from a fuel
 * receipt image, writing advisory `aiExtracted` data onto the bound
 * `fuel_receipt` resource. This is NOT a fabricated capability: AiService
 * genuinely exposes `isConfigured`/`runVision` today and is already used
 * for this exact purpose in the prototype.
 *
 * AI GUARDRAIL (non-negotiable, matches the prototype's contract exactly):
 *   - All extracted values are ADVISORY ONLY.
 *   - `approvedByHuman` is always false here — set true only by a human
 *     via a separate approval step, never by this node.
 *   - Extraction is advisory; expense or payroll approval remains
 *     human-controlled.
 *
 * Config/Inputs:
 *   receipt.resourceId — the fuel_receipt resourceId (required)
 *   receipt.imageData   — base64 data URI (required)
 *   confidenceThreshold — default 0.5
 *   reviewLowConfidence — default true
 *
 * Outputs:
 *   extraction — { advisory:true, amount, liters, fuelType, stationName,
 *                  receiptDate, vehicleReg, confidence, requiresReview }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IAiVisionService, IReadResourceService, IUpdateResourceService } from '../types';

export interface ExtractFuelReceiptServices {
  aiService?: IAiVisionService;
  readService?: IReadResourceService;
  updateService?: IUpdateResourceService;
}

const VISION_SYSTEM_PROMPT = `You are a fuel receipt data extraction assistant.

Extract the following fields from the receipt image and return ONLY valid JSON — no markdown, no explanation:
{
  "amount":      number or null,
  "liters":      number or null,
  "fuelType":    string,
  "stationName": string or null,
  "receiptDate": string or null,
  "vehicleReg":  string or null,
  "confidence":  number
}

Rules:
- Use null for any field you cannot confidently read from the image.
- amount must be the TOTAL amount paid, not a per-litre price.
- If the image is blurry, damaged, or not a fuel receipt, set confidence below 0.4.
- Return ONLY the JSON object. No markdown code fences.`;

const VISION_USER_TEXT = 'Extract all fuel receipt data from this image. Return JSON only.';

export async function extractFuelReceipt(
  ctx: NodeContext,
  services: ExtractFuelReceiptServices = {},
): Promise<NodeExecuteResult> {
  const { aiService, readService, updateService } = services;

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const receiptInput = (inp['receipt'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (receiptInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const imageData = receiptInput['imageData'] as string | undefined;
  const confidenceThreshold = (cfg['confidenceThreshold'] as number | undefined) ?? 0.5;
  const reviewLowConfidence = (cfg['reviewLowConfidence'] as boolean | undefined) ?? true;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { extraction: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.extract_fuel_receipt: resourceId is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { extraction: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.asset_fleet.extract_fuel_receipt: organizationId missing from execution context' },
    };
  }

  if (readService) {
    try {
      const receipt = await readService.getResource(resourceId, ctx.organizationId);
      if (receipt.type !== 'fuel_receipt') {
        return {
          status: 'failure',
          outputs: { extraction: null },
          error: { code: 'INVALID_RESOURCE_TYPE', message: `lados.asset_fleet.extract_fuel_receipt: resource ${resourceId} is type '${receipt.type}', expected 'fuel_receipt'` },
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'failure', outputs: { extraction: null }, error: { code: 'RESOURCE_NOT_FOUND', message } };
    }
  }

  const actorId = ctx.userId ?? 'system';

  if (!aiService || !aiService.isConfigured) {
    ctx.logger.warn(`lados.asset_fleet.extract_fuel_receipt: AI not configured — writing stub advisory data for receipt ${resourceId}`);
    const stub = {
      advisory: true,
      amount: null,
      liters: null,
      fuelType: 'unknown',
      stationName: null,
      receiptDate: null,
      vehicleReg: null,
      confidence: 0,
      requiresReview: true,
      approvedByHuman: false,
      warning: 'AI not configured. All fields require manual entry.',
    };
    if (updateService) {
      await updateService.updateResource(resourceId, ctx.organizationId, { data: { aiExtracted: stub } }, actorId);
    }
    return {
      status: 'success',
      outputs: { extraction: stub },
      summary: 'Fuel receipt extraction stub (AI not configured) — manual entry required',
    };
  }

  if (!imageData || !imageData.startsWith('data:image/')) {
    return {
      status: 'failure',
      outputs: { extraction: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.extract_fuel_receipt: receipt.imageData (base64 image data URI) is required' },
    };
  }

  let rawText: string;
  try {
    rawText = await aiService.runVision(VISION_SYSTEM_PROMPT, VISION_USER_TEXT, imageData, {
      model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 512, jsonMode: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.asset_fleet.extract_fuel_receipt: vision API call failed — ${message}`);
    return { status: 'failure', outputs: { extraction: null }, error: { code: 'VISION_CALL_FAILED', message } };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText.replace(/```(?:json)?/gi, '').trim()) as Record<string, unknown>;
  } catch {
    return {
      status: 'failure',
      outputs: { extraction: null },
      error: { code: 'INVALID_AI_RESPONSE', message: 'lados.asset_fleet.extract_fuel_receipt: AI returned invalid JSON' },
    };
  }

  const amount = typeof parsed['amount'] === 'number' ? parsed['amount'] : null;
  const liters = typeof parsed['liters'] === 'number' ? parsed['liters'] : null;
  const fuelType = typeof parsed['fuelType'] === 'string' ? parsed['fuelType'] : 'unknown';
  const stationName = typeof parsed['stationName'] === 'string' ? parsed['stationName'] : null;
  const receiptDate = typeof parsed['receiptDate'] === 'string' ? parsed['receiptDate'] : null;
  const vehicleReg = typeof parsed['vehicleReg'] === 'string' ? parsed['vehicleReg'] : null;
  const confidence = typeof parsed['confidence'] === 'number' ? Math.min(Math.max(parsed['confidence'], 0), 1) : 0.5;
  const requiresReview = reviewLowConfidence && confidence < confidenceThreshold;

  const extraction = {
    advisory: true,
    amount, liters, fuelType, stationName, receiptDate, vehicleReg, confidence,
    requiresReview,
    approvedByHuman: false, // GUARDRAIL: always false — a human sets this only on explicit approval
  };

  if (updateService) {
    await updateService.updateResource(resourceId, ctx.organizationId, { data: { aiExtracted: extraction } }, actorId);
  }

  ctx.logger.info(`lados.asset_fleet.extract_fuel_receipt → amount:${amount} liters:${liters} confidence:${(confidence * 100).toFixed(0)}%`);

  return {
    status: 'success',
    outputs: { extraction },
    summary: `Extracted (advisory): ${amount ?? '?'} · ${liters ?? '?'}L · ${fuelType} · confidence ${(confidence * 100).toFixed(0)}%`,
  };
}
