/**
 * contractor.extract_fuel_data
 *
 * Uses GPT-4o vision to extract data from a fuel receipt image.
 * Writes advisory `aiExtracted` fields onto the fuel_receipt resource.
 *
 * AI GUARDRAIL (non-negotiable):
 *   - All extracted values are ADVISORY ONLY.
 *   - The receipt stays in 'pending_review' state after extraction.
 *   - No AI-extracted value may be posted to finance without owner/admin
 *     human approval (via foundation.request_approval or manual transition).
 *   - The `aiExtracted.approvedByHuman` flag is always false here;
 *     it is set to true only when a human explicitly approves.
 *
 * Inputs:
 *   receiptId  — fuel_receipt resource ID (required)
 *
 * Outputs:
 *   receiptId      — same ID (pass-through for chaining)
 *   amount         — extracted MYR amount (advisory)
 *   liters         — extracted fuel quantity in litres (advisory)
 *   fuelType       — 'petrol' | 'diesel' | 'ron95' | 'ron97' | 'euro5' | 'unknown'
 *   stationName    — petrol station name (advisory)
 *   receiptDate    — date on receipt ISO string (advisory)
 *   vehicleReg     — vehicle registration on receipt if visible (advisory)
 *   confidence     — 0–1 overall confidence score
 *   aiExtracted    — full extracted object written to resource data
 *   warning        — human-readable advisory note
 *
 * Phase 10 (S10-007)
 */

import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

// ── Service interfaces ────────────────────────────────────────────────────────

/** Minimal AI service interface — NestJS AiService satisfies this via duck typing */
export interface IAiVisionService {
  isConfigured: boolean;
  runVision(
    systemPrompt: string,
    userText:     string,
    imageUrl:     string,
    options?:     { model?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<string>;
}

/** Minimal resource service interface for fetching and updating receipts */
export interface IFuelExtractResourceService {
  findById(id: string, orgId: string): Promise<{
    id: string; type: string; name: string; state: string;
    data: Record<string, unknown>;
  } | null>;
  updateResource(
    id: string, orgId: string,
    updates: { data?: Record<string, unknown> },
    updatedBy?: string,
  ): Promise<unknown>;
}

// ── Extracted data shape ──────────────────────────────────────────────────────

export interface AiExtractedFuelData {
  amount:          number | null;
  liters:          number | null;
  fuelType:        string;
  stationName:     string | null;
  receiptDate:     string | null;
  vehicleReg:      string | null;
  confidence:      number;
  approvedByHuman: false;           // always false — human sets this on approval
  extractedAt:     string;
  model:           string;
  warning:         string;
}

// ── System prompt ─────────────────────────────────────────────────────────────

const VISION_SYSTEM_PROMPT = `You are a fuel receipt data extraction assistant for a Malaysian construction contractor company.

Extract the following fields from the receipt image and return ONLY valid JSON — no markdown, no explanation:
{
  "amount":      number or null,     // MYR total amount paid (numeric only, no currency symbol)
  "liters":      number or null,     // fuel quantity in litres (numeric only)
  "fuelType":    string,             // one of: "ron95", "ron97", "euro5", "diesel", "petrol", "unknown"
  "stationName": string or null,     // petrol station name (e.g. "Petronas Rawang", "Shell PLUS")
  "receiptDate": string or null,     // date in YYYY-MM-DD format if visible
  "vehicleReg":  string or null,     // vehicle registration number if printed on receipt
  "confidence":  number              // 0.0 to 1.0 — your overall confidence in the extraction
}

Rules:
- Use null for any field you cannot confidently read from the image.
- amount must be the TOTAL amount paid (MYR), not a per-litre price.
- If the image is blurry, damaged, or not a fuel receipt, set confidence below 0.4.
- Return ONLY the JSON object. No markdown code fences.`;

const VISION_USER_TEXT = 'Extract all fuel receipt data from this image. Return JSON only.';

// ── Helper ────────────────────────────────────────────────────────────────────

function err(message: string): NodeExecuteResult {
  return { status: 'failure', outputs: {}, error: { code: 'VALIDATION_ERROR', message } };
}

// ── Node implementation ───────────────────────────────────────────────────────

export async function realExtractFuelData(
  ctx:              NodeContext,
  aiService?:       IAiVisionService,
  resourceService?: IFuelExtractResourceService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;

  const receiptId = (inp['fuel_receiptId'] as string | undefined)
    ?? (inp['receiptId'] as string | undefined)          // legacy fallback
    ?? (ctx.config['receiptId'] as string | undefined);

  // imageData is a base64 data URI provided directly by the user via the modal file picker
  const imageData = inp['imageData'] as string | undefined;

  if (!receiptId)           return err('contractor.extract_fuel_data: receiptId is required');
  if (!imageData)           return err('contractor.extract_fuel_data: imageData is required — please select a receipt image');
  if (!imageData.startsWith('data:image/')) return err('contractor.extract_fuel_data: imageData must be an image file');
  if (!ctx.organizationId)  return err('contractor.extract_fuel_data: organizationId missing from context');
  if (!resourceService)     return err('contractor.extract_fuel_data: resourceService not injected');

  // ── 1. Fetch the fuel receipt resource ──────────────────────────────────────

  const receipt = await resourceService.findById(receiptId, ctx.organizationId);

  if (!receipt) {
    return err(`contractor.extract_fuel_data: fuel receipt ${receiptId} not found`);
  }
  if (receipt.type !== 'fuel_receipt') {
    return err(`contractor.extract_fuel_data: resource ${receiptId} is type '${receipt.type}', expected 'fuel_receipt'`);
  }

  // ── 2. AI not configured — advisory stub ────────────────────────────────────

  if (!aiService || !aiService.isConfigured) {
    ctx.logger.warn(`contractor.extract_fuel_data: AI not configured — writing stub advisory data for receipt ${receiptId}`);

    const stubExtracted: AiExtractedFuelData = {
      amount:          null,
      liters:          null,
      fuelType:        'unknown',
      stationName:     null,
      receiptDate:     null,
      vehicleReg:      null,
      confidence:      0,
      approvedByHuman: false,
      extractedAt:     new Date().toISOString(),
      model:           'none',
      warning:         'AI not configured. Set OPENAI_API_KEY to enable extraction. All fields require manual entry.',
    };

    await resourceService.updateResource(
      receiptId,
      ctx.organizationId,
      { data: { ...receipt.data, aiExtracted: stubExtracted } },
      ctx.userId,
    );

    return {
      status: 'success',
      outputs: {
        receiptId,
        amount:      null,
        liters:      null,
        fuelType:    'unknown',
        stationName: null,
        receiptDate: null,
        vehicleReg:  null,
        confidence:  0,
        aiExtracted: stubExtracted,
        warning:     stubExtracted.warning,
      },
    };
  }

  // ── 3. Call GPT-4o-mini vision ───────────────────────────────────────────────

  ctx.logger.info(`contractor.extract_fuel_data: calling vision API for receipt ${receiptId}`);

  let rawText = '';
  try {
    rawText = await aiService.runVision(
      VISION_SYSTEM_PROMPT,
      VISION_USER_TEXT,
      imageData,   // base64 data URI uploaded directly by the user — no URL needed
      { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 512, jsonMode: true },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.logger.error(`contractor.extract_fuel_data: vision API call failed — ${msg}`);
    return err(`contractor.extract_fuel_data: vision API call failed — ${msg}`);
  }

  // ── 4. Parse extraction result ──────────────────────────────────────────────

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(rawText.replace(/```(?:json)?/gi, '').trim()) as Record<string, unknown>;
  } catch {
    ctx.logger.error(`contractor.extract_fuel_data: could not parse AI response — "${rawText.slice(0, 300)}"`);
    return err('contractor.extract_fuel_data: AI returned invalid JSON. Receipt may be unreadable.');
  }

  const amount      = typeof parsed['amount']      === 'number' ? parsed['amount']      : null;
  const liters      = typeof parsed['liters']      === 'number' ? parsed['liters']      : null;
  const fuelType    = typeof parsed['fuelType']    === 'string' ? parsed['fuelType']    : 'unknown';
  const stationName = typeof parsed['stationName'] === 'string' ? parsed['stationName'] : null;
  const receiptDate = typeof parsed['receiptDate'] === 'string' ? parsed['receiptDate'] : null;
  const vehicleReg  = typeof parsed['vehicleReg']  === 'string' ? parsed['vehicleReg']  : null;
  const confidence  = typeof parsed['confidence']  === 'number'
    ? Math.min(Math.max(parsed['confidence'], 0), 1)
    : 0.5;

  const warning = confidence < 0.5
    ? `Low confidence (${(confidence * 100).toFixed(0)}%) — please verify all extracted values before approving.`
    : 'AI extraction is advisory only. Human approval required before values are used commercially.';

  // ── 5. Write aiExtracted back to resource ───────────────────────────────────

  const aiExtracted: AiExtractedFuelData = {
    amount,
    liters,
    fuelType,
    stationName,
    receiptDate,
    vehicleReg,
    confidence,
    approvedByHuman: false,  // GUARDRAIL: always false; set true only on human approval
    extractedAt:     new Date().toISOString(),
    model:           'gpt-4o-mini',
    warning,
  };

  ctx.logger.info(`contractor.extract_fuel_data: parsed OK — writing aiExtracted to ${receiptId} (confidence ${(confidence * 100).toFixed(0)}%)`);

  await resourceService.updateResource(
    receiptId,
    ctx.organizationId,
    { data: { ...receipt.data, aiExtracted } },
    ctx.userId,
  );

  ctx.logger.info(
    `contractor.extract_fuel_data: extracted — amount: ${amount} MYR, liters: ${liters}L, confidence: ${(confidence * 100).toFixed(0)}%`,
  );

  return {
    status: 'success',
    outputs: {
      receiptId,
      amount,
      liters,
      fuelType,
      stationName,
      receiptDate,
      vehicleReg,
      confidence,
      aiExtracted,
      warning,
    },
    summary: `Extracted: ${amount ?? '?'} MYR · ${liters ?? '?'}L · ${fuelType} · ${stationName ?? 'unknown station'} · confidence ${(confidence * 100).toFixed(0)}%`,
  };
}
