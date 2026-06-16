/**
 * @qsos/core-pack
 *
 * Core workflow control nodes: Start, End, Branch, Merge, Delay, Webhook.
 * Sprint 1 stub — node implementations added in Sprint 3.
 */
import type { PackManifest } from '@qsos/pack-sdk';

export const PACK_ID = 'core-pack' as const;
export const PACK_VERSION = '0.1.0' as const;

export const manifest: PackManifest = {
  id: PACK_ID,
  version: PACK_VERSION,
  displayName: 'Core Pack',
  description: 'Fundamental workflow control nodes (Start, End, Branch, Merge, Delay, Webhook)',
  author: 'QS-OS Team',
  nodes: [
    'core.start',
    'core.end',
    'core.branch',
    'core.merge',
    'core.delay',
    'core.webhook',
  ],
};

// Sprint 3: export { StartNode } from './nodes/start.node';
// Sprint 3: export { EndNode } from './nodes/end.node';
// Sprint 3: export { BranchNode } from './nodes/branch.node';
// Sprint 3: export { MergeNode } from './nodes/merge.node';
// Sprint 3: export { DelayNode } from './nodes/delay.node';
// Sprint 3: export { WebhookNode } from './nodes/webhook.node';
