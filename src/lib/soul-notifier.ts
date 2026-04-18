/**
 * Soul Integration Engine notifier.
 *
 * Fires a POST to the Soul webhook URL whenever a significant procurement
 * event occurs, so Soul can trigger matching flows.
 *
 * All calls are fire-and-forget: errors are logged but never bubble up
 * to the caller so the procurement API always returns normally.
 *
 * Required env vars:
 *   SOUL_WEBHOOK_URL  – full webhook URL from the Soul engine app settings
 *                       e.g. http://localhost:5002/api/v1/apps/9/events
 */

const TIMEOUT_MS = 8_000;

export type SoulEvent =
  | 'purchase_order.created'
  | 'purchase_order.status_changed'
  | 'purchase_order.approved'
  | 'purchase_order.rejected'
  | 'purchase_order.submitted'
  | 'purchase_requisition.created'
  | 'purchase_requisition.submitted'
  | 'purchase_requisition.approved'
  | 'purchase_requisition.rejected'
  | 'goods_receipt.created'
  | 'invoice.created'
  | 'invoice.approved';

export interface SoulEventPayload {
  event: SoulEvent;
  /** Identifies this app in Soul */
  source: 'procurement';
  data: Record<string, unknown>;
}

/**
 * Sends an event to the Soul engine.
 * Call with `void notifySoul(...)` — do not await unless you need
 * the result for something.
 */
export async function notifySoul(
  event: SoulEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const webhookUrl = process.env.SOUL_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    console.warn('[soul-notifier] SOUL_WEBHOOK_URL not set — skipping event:', event);
    return;
  }

  const payload: SoulEventPayload = {
    event,
    source: 'procurement',
    data,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  console.log(`[soul-notifier] Sending event "${event}" →`, webhookUrl);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (res.ok) {
      console.log(`[soul-notifier] ✓ Event "${event}" delivered (HTTP ${res.status})`);
    } else {
      const text = await res.text().catch(() => '');
      console.error(`[soul-notifier] ✗ Engine returned ${res.status} for event "${event}":`, text);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[soul-notifier] ✗ Failed to deliver event "${event}":`, msg);
  } finally {
    clearTimeout(timer);
  }
}
