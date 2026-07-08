/**
 * DEPRECATED — this route is no longer part of the Lados platform.
 *
 * Trips and fuel receipts are resource types (originally introduced by the
 * now-archived contractor-pack prototype; the resource types themselves
 * live in migration 0032, not in any pack source).
 * Access them via /resources?type=trip or /resources?type=fuel_receipt
 *
 * See docs/LCE_V1/Lados_Core_Engine_V1_Implementation_Blueprint.md §3.10
 */
import { redirect } from 'next/navigation';

export default function OperationsRedirect() {
  redirect('/resources?type=trip');
}
