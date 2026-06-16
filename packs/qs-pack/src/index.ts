/**
 * @qsos/qs-pack
 *
 * Quantity Surveying domain nodes: BOQ, measurement sheets, cost plans,
 * interim valuations, variation orders, final accounts.
 * Sprint 1 stub — the primary domain pack, full implementation Sprint 3–5.
 */
import type { PackManifest } from '@qsos/pack-sdk';

export const PACK_ID = 'qs-pack' as const;
export const PACK_VERSION = '0.1.0' as const;

export const manifest: PackManifest = {
  id: PACK_ID,
  version: PACK_VERSION,
  displayName: 'QS Pack',
  description:
    'Quantity Surveying business capabilities — BOQ reading, trade classification, cost plans, RFQ splitting, rate analysis',
  author: 'QS-OS Team',
  nodes: [
    // BOQ processing capabilities (Vol 0 §28.1)
    'qs.read-boq',             // Read BOQ
    'qs.clean-boq',            // Clean BOQ
    'qs.validate-boq',         // Validate BOQ
    'qs.classify-trade',       // AI Classify Trade
    'qs.split-work-package',   // Split Work Packages
    'qs.generate-cost-summary',// Generate Cost Summary
    'qs.rate-analysis',        // Rate Analysis
    'qs.detect-missing-items', // Detect Missing Items
  ],
};

// Sprint 3+: export { ReadBoqNode } from './nodes/read-boq.node';
// Sprint 3+: export { CleanBoqNode } from './nodes/clean-boq.node';
// Sprint 3+: export { ValidateBoqNode } from './nodes/validate-boq.node';
// Sprint 3+: export { ClassifyTradeNode } from './nodes/classify-trade.node';
// Sprint 3+: export { SplitWorkPackageNode } from './nodes/split-work-package.node';
// Sprint 5+: export { RateAnalysisNode } from './nodes/rate-analysis.node';
