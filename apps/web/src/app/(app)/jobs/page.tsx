/**
 * DEPRECATED — this route is no longer part of the Lados platform.
 *
 * Jobs are a resource type (originally introduced by the now-archived
 * contractor-pack prototype; the resource type itself lives in migration
 * 0032, not in any pack source).
 * Access them via /resources?type=job
 *
 * See docs/LCE_V1/Lados_Core_Engine_V1_Implementation_Blueprint.md §3.10
 */
import { redirect } from 'next/navigation';

export default function JobsRedirect() {
  redirect('/resources?type=job');
}
