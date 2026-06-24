/**
 * @lados/contractor-pack
 *
 * Contractor Edition nodes for Lados — jobs, trips, fleet, fuel, invoices,
 * payments, expenses, maintenance, operators, and payroll.
 *
 * Phase 9  M1: create_job, dispatch_trip, complete_trip, upload_fuel_receipt, generate_invoice
 * Phase 9  M2: record_payment, approve_expense
 * Phase 9  M3: create_maintenance_record, clear_maintenance
 * Phase 9  M4: prepare_payroll_run, approve_payroll
 * Phase 10 AI: extract_fuel_data (GPT-4o vision, advisory only)
 *
 * AI guardrails (non-negotiable):
 *   - contractor.upload_fuel_receipt:  AI extraction advisory only. Costs may not be
 *     posted to finance without owner/admin human approval.
 *   - contractor.generate_invoice:     Invoice must reach 'pending_approval' and be
 *     reviewed by owner/admin before sending. No AI output may advance past 'pending_approval'.
 *   - contractor.approve_expense:      Must appear downstream of foundation.request_approval.
 *     AI cannot approve expenses.
 *   - contractor.approve_payroll:      Must appear downstream of foundation.request_approval.
 *     System never initiates bank transfer. Owner marks as paid after performing transfer.
 *
 * Depends on: @lados/foundation-pack (must be active)
 */

import type { PackManifest } from '@lados/pack-sdk';
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

// ── M1 — Core Operations ──────────────────────────────────────────────────────
import { realCreateJob }                   from './nodes/contractor-create-job';
import { realDispatchTrip }                from './nodes/contractor-dispatch-trip';
import { realCompleteTrip }                from './nodes/contractor-complete-trip';
import { realUploadFuelReceipt }           from './nodes/contractor-upload-fuel-receipt';
import { realGenerateInvoice }             from './nodes/contractor-generate-invoice';

// ── M2 — Finance ─────────────────────────────────────────────────────────────
import { realRecordPayment }               from './nodes/contractor-record-payment';
import { realApproveExpense }              from './nodes/contractor-approve-expense';

// ── M3 — Fleet Maintenance ────────────────────────────────────────────────────
import { realCreateMaintenanceRecord }     from './nodes/contractor-create-maintenance-record';
import { realClearMaintenance }            from './nodes/contractor-clear-maintenance';

// ── M4 — HR / Payroll ─────────────────────────────────────────────────────────
import { realPreparePayrollRun }           from './nodes/contractor-prepare-payroll-run';
import { realApprovePayroll }              from './nodes/contractor-approve-payroll';

// ── Phase 10 — AI ─────────────────────────────────────────────────────────────
import { realExtractFuelData }             from './nodes/contractor-extract-fuel-data';

// ── Re-export service interfaces ──────────────────────────────────────────────
export { type IResourceService }               from './nodes/contractor-create-job';
export { type IResourceUpdateService }         from './nodes/contractor-complete-trip';
export { type IInvoiceResourceService }        from './nodes/contractor-generate-invoice';
export { type IPaymentResourceService }        from './nodes/contractor-record-payment';
export { type IExpenseApprovalService }        from './nodes/contractor-approve-expense';
export { type IMaintenanceCreateService }      from './nodes/contractor-create-maintenance-record';
export { type IMaintenanceClearService }       from './nodes/contractor-clear-maintenance';
export { type IPayrollCreateService }          from './nodes/contractor-prepare-payroll-run';
export { type IPayrollApprovalService }        from './nodes/contractor-approve-payroll';
export { type IAiVisionService, type IFuelExtractResourceService } from './nodes/contractor-extract-fuel-data';

// ── Re-export type catalogue ──────────────────────────────────────────────────
export {
  CONTRACTOR_RESOURCE_TYPES,
  CONTRACTOR_EVENTS,
  type ContractorResourceType,
  type ContractorEventType,
  type JobData,
  type TripData,
  type FuelReceiptData,
  type MaintenanceRecordData,
  type InvoiceData,
  type InvoiceLineItem,
  type PaymentData,
  type ExpenseData,
  type PayrollRunEmployee,
  type PayrollRunData,
} from './types';

// ── Pack identity ─────────────────────────────────────────────────────────────

export const PACK_ID      = 'contractor-pack' as const;
export const PACK_VERSION = '0.4.0' as const;

export const manifest: PackManifest = {
  id:          'lados.contractor-pack',
  version:     PACK_VERSION,
  displayName: 'Contractor Edition',
  description: 'Job, trip, fleet, fuel, invoicing, payments, expenses, maintenance, and payroll for civil and earth-works contractors.',
  author:      'Lados Platform',
  dependencies: ['lados.foundation-pack'],

  nodes: [
    // M1 — Core Operations
    'contractor.create_job',
    'contractor.dispatch_trip',
    'contractor.complete_trip',
    'contractor.upload_fuel_receipt',
    'contractor.generate_invoice',
    // M2 — Finance
    'contractor.record_payment',
    'contractor.approve_expense',
    // M3 — Fleet Maintenance
    'contractor.create_maintenance_record',
    'contractor.clear_maintenance',
    // M4 — HR / Payroll
    'contractor.prepare_payroll_run',
    'contractor.approve_payroll',
    // Phase 10 — AI
    'contractor.extract_fuel_data',
  ],

  // ── Resource type definitions with type-aware view configs ────────────────
  resources: [

    // ── M1 — Operations ────────────────────────────────────────────────────

    {
      type:              'job',
      displayName:       'Job',
      displayNamePlural: 'Jobs',
      icon:              '💼',
      views: {
        list: {
          primaryField:   'name',
          secondaryField: 'data.scheduledDate',
          badgeField:     'state',
          counterField:   'data.tripCount',
          mobileLayout:   'card',
        },
        inlineActions: [
          { label: 'Dispatch Trip',    node: 'contractor.dispatch_trip',    visibleInStates: ['active'],               icon: '🚛' },
          { label: 'Generate Invoice', node: 'contractor.generate_invoice', visibleInStates: ['active', 'completed'],  icon: '🧾', requiresConfirm: true },
        ],
      },
    },

    {
      type:              'trip',
      displayName:       'Trip',
      displayNamePlural: 'Trips',
      icon:              '🚛',
      views: {
        list: {
          primaryField:   'name',
          secondaryField: 'data.driverId',
          badgeField:     'state',
          mobileLayout:   'card',
        },
        inlineActions: [
          { label: 'Start Trip',    node: 'state.change',             visibleInStates: ['pending'],               icon: '▶️' },
          { label: 'Mark Complete', node: 'contractor.complete_trip', visibleInStates: ['in_progress'],           icon: '✅' },
          { label: 'Cancel',        node: 'state.change',             visibleInStates: ['pending', 'in_progress'], icon: '✕', requiresConfirm: true },
        ],
      },
    },

    {
      type:              'fuel_receipt',
      displayName:       'Fuel Receipt',
      displayNamePlural: 'Fuel Receipts',
      icon:              '⛽',
      views: {
        list: {
          primaryField:   'name',
          secondaryField: 'data.stationName',
          badgeField:     'state',
          mobileLayout:   'card',
        },
        inlineActions: [
          { label: 'Extract Data', node: 'contractor.extract_fuel_data', visibleInStates: ['pending_review'], icon: '🤖' },
          { label: 'Approve',      node: 'state.change',                 visibleInStates: ['pending_review'], icon: '✅', requiresConfirm: true },
          { label: 'Reject',       node: 'state.change',                 visibleInStates: ['pending_review'], icon: '❌', requiresConfirm: true },
        ],
      },
    },

    {
      type:              'customer',
      displayName:       'Customer',
      displayNamePlural: 'Customers',
      icon:              '🏢',
      views: {
        list: {
          primaryField:   'name',
          secondaryField: 'data.contactPhone',
          badgeField:     'state',
          mobileLayout:   'card',
        },
      },
    },

    {
      type:              'vehicle',
      displayName:       'Vehicle',
      displayNamePlural: 'Vehicles',
      icon:              '🚛',
      views: {
        list: {
          primaryField:   'name',
          secondaryField: 'data.plateNumber',
          badgeField:     'state',
          mobileLayout:   'card',
        },
        inlineActions: [
          { label: 'Send for Service', node: 'contractor.create_maintenance_record', visibleInStates: ['available', 'deployed'], icon: '🔧' },
        ],
      },
    },

    {
      type:              'driver',
      displayName:       'Driver',
      displayNamePlural: 'Drivers',
      icon:              '👤',
      views: {
        list: {
          primaryField:   'name',
          secondaryField: 'data.licenseNumber',
          badgeField:     'state',
          mobileLayout:   'card',
        },
      },
    },

    {
      type:              'equipment',
      displayName:       'Equipment',
      displayNamePlural: 'Equipment',
      icon:              '🏗️',
      views: {
        list: {
          primaryField:   'name',
          secondaryField: 'data.serialNumber',
          badgeField:     'state',
          mobileLayout:   'card',
        },
        inlineActions: [
          { label: 'Send for Service', node: 'contractor.create_maintenance_record', visibleInStates: ['available', 'deployed'], icon: '🔧' },
        ],
      },
    },

    {