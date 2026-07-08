/**
 * lados.workflow.publish_event — Phase 21 S9.1 (gap closure)
 *
 * Official successor to the prototype `event.publish`. Emits a custom
 * domain event to the platform Event Bus. Events are observational only —
 * they can trigger subscribed workflows, but publishing an event never by
 * itself approves, certifies, releases payment, or creates a commercial
 * fact. Any workflow triggered by a subscription still requires a Human
 * Work approval node for any consequential action.
 *
 * This closes a "declared but unbuilt" gap: manifest.json has always
 * declared the `workflow.event.publish` capability, but no node backed it
 * until now.
 *
 * Config/Inputs:
 *   eventType — required event type string (e.g. "event.custom" or any domain type)
 *   payload   — optional object of arbitrary key/value data attached to the event
 *   sourceId  — optional ID of the resource/entity that caused this event
 *
 * Outputs:
 *   eventId   — the persisted event ID, or null if publish failed
 *   published — whether the event was written to the log
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export interface IEventBusService {
  publish(params: {
    orgId: string;
    type: string;
    sourceType?: string;
    sourceId?: string;
    actorId?: string;
    payload?: Record<string, unknown>;
  }): Promise<{ id: string } | null>;
}

export async function publishEvent(
  ctx: NodeContext,
  eventBus?: IEventBusService,
): Promise<NodeExecuteResult> {
  if (!eventBus) {
    return {
      status: 'failure',
      outputs: { eventId: null, published: false },
      error: { code: 'NO_SERVICE', message: 'Event bus service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const eventType = (inp['eventType'] ?? cfg['eventType']) as string | undefined;
  const payload = (inp['payload'] as Record<string, unknown> | undefined) ?? {};
  const sourceId = (inp['sourceId'] ?? cfg['sourceId']) as string | undefined;

  if (!eventType) {
    return {
      status: 'failure',
      outputs: { eventId: null, published: false },
      error: { code: 'MISSING_INPUT', message: 'lados.workflow.publish_event: eventType is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { eventId: null, published: false },
      error: { code: 'MISSING_CONTEXT', message: 'lados.workflow.publish_event: organizationId missing from execution context' },
    };
  }

  ctx.logger.info(`lados.workflow.publish_event → type:${eventType}${sourceId ? ` source:${sourceId}` : ''}`);

  const event = await eventBus.publish({
    orgId: ctx.organizationId,
    type: eventType,
    sourceType: 'node',
    sourceId,
    actorId: ctx.userId,
    payload,
  });

  return {
    status: 'success',
    outputs: { eventId: event?.id ?? null, published: event !== null },
    summary: event ? `Event "${eventType}" published` : `Event "${eventType}" publish failed (logged, not thrown)`,
  };
}
