-- =============================================================================
-- Migration 0036 — Register contractor.extract_fuel_data in registered_nodes
--
-- This node was implemented in Phase 10 (S10-007) but its DB registration
-- was accidentally omitted from migration 0035.
--
-- AI GUARDRAIL (non-negotiable):
--   All extracted values are ADVISORY ONLY. The receipt stays in
--   'pending_review'. No AI-extracted value may advance to finance
--   without owner/admin human approval.
-- =============================================================================

INSERT INTO registered_nodes (
  type, name, description, category, pack_id, icon, color,
  is_enabled, config_schema, inputs, outputs
) VALUES (
  'contractor.extract_fuel_data',
  'Extract Fuel Data (AI)',
  'Uses GPT-4o vision to extract data from a fuel receipt image. Writes advisory aiExtracted fields onto the receipt resource. All values are advisory only — receipt stays in pending_review until a human approves. Requires OPENAI_API_KEY; degrades gracefully to a stub advisory when AI is not configured.',
  'contractor',
  'lados.contractor-pack',
  'cpu',
  '#8B5CF6',
  true,
  '{"type":"object","properties":{"fuel_receiptId":{"type":"string","title":"Fuel Receipt"},"imageData":{"type":"file","title":"Receipt Image"}},"required":["fuel_receiptId","imageData"]}',
  '[{"name":"fuel_receiptId","type":"string","required":true,"description":"ID of the fuel_receipt resource to update (auto-filled)"},{"name":"imageData","type":"file","required":true,"description":"Photo of the fuel receipt — taken from phone or scanned"}]',
  '[{"name":"receiptId","type":"string"},{"name":"amount","type":"number"},{"name":"liters","type":"number"},{"name":"fuelType","type":"string"},{"name":"stationName","type":"string"},{"name":"receiptDate","type":"string"},{"name":"vehicleReg","type":"string"},{"name":"confidence","type":"number"},{"name":"aiExtracted","type":"object"},{"name":"warning","type":"string"}]'
) ON CONFLICT (type) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  inputs      = EXCLUDED.inputs,
  outputs     = EXCLUDED.outputs,
  is_enabled  = EXCLUDED.is_enabled;
