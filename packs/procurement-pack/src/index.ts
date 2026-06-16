/**
 * @qsos/procurement-pack
 *
 * Procurement workflow nodes: tender, subcontract award, supplier management,
 * purchase orders, delivery receipts.
 * Sprint 1 stub — implementation deferred to Sprint 5.
 */
import type { PackManifest } from '@qsos/pack-sdk';

export const PACK_ID = 'procurement-pack' as const;
export const PACK_VERSION = '0.1.0' as const;

export const manifest: PackManifest = {
  id: PACK_ID,
  version: PACK_VERSION,
  displayName: 'Procurement Pack',
  description:
    'Procurement business capabilities — RFQ generation, quotation collection and comparison, supplier recommendation, purchase orders',
  author: 'QS-OS Team',
  nodes: [
    // Procurement capabilities (Vol 0 §28.2)
    'procurement.generate-rfq',         // Generate RFQ
    'procurement.send-rfq',             // Send RFQ
    'procurement.collect-quotation',    // Collect Quotation
    'procurement.normalize-quotation',  // Normalize Quotation
    'procurement.compare-quotations',   // Compare Quotations
    'procurement.recommend-supplier',   // Recommend Supplier
    'procurement.generate-purchase-order', // Generate Purchase Order
  ],
};

// Sprint 5: export { GenerateRfqNode } from './nodes/generate-rfq.node';
// Sprint 5: export { CompareQuotationsNode } from './nodes/compare-quotations.node';
// Sprint 5: export { RecommendSupplierNode } from './nodes/recommend-supplier.node';
// Sprint 5: export { GeneratePurchaseOrderNode } from './nodes/generate-purchase-order.node';
