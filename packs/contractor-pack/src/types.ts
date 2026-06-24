/**
 * Contractor Pack — Type Catalogue
 *
 * Canonical resource type names and event type names for the Contractor Edition.
 * These match the lados_resources.type CHECK constraint values.
 *
 * M1 (Phase 9):   customer, driver, vehicle, equipment, job, trip, fuel_receipt, maintenance_record, invoice, payment, expense
 * M3 (Phase 9):   operator
 * M4 (Phase 9):   payroll_run
 */

// ── Contractor resource types ─────────────────────────────────────────────────

export const CONTRACTOR_RESOURCE_TYPES = [
  // People
  'customer',
  'driver',
  'operator',
  // Assets
  'vehicle',
  'equipment',
  // Operations
  'job',
  'trip',
  'fuel_receipt',
  'maintenance_record',
  // Finance
  'invoice',
  'payment',
  'expense',
  // HR
  'payroll_run',
] as const;

export type ContractorResourceType = typeof CONTRACTOR_RESOURCE_TYPES[number];

// ── Contractor event types ────────────────────────────────────────────────────

export const CONTRACTOR_EVENTS = {
  // Job lifecycle
  JOB_CREATED:                  'job.created',
  JOB_STARTED:                  'job.started',
  JOB_COMPLETED:                'job.completed',
  JOB_CANCELLED:                'job.cancelled',

  // Trip lifecycle
  TRIP_DISPATCHED:              'trip.dispatched',
  TRIP_STARTED:                 'trip.started',
  TRIP_COMPLETED:               'trip.completed',
  TRIP_CANCELLED:               'trip.cancelled',

  // Fleet / vehicle / equipment
  VEHICLE_DEPLOYED:             'vehicle.deployed',
  VEHICLE_RETURNED:             'vehicle.returned',
  VEHICLE_BREAKDOWN:            'vehicle.breakdown',
  EQUIPMENT_DEPLOYED:           'equipment.deployed',
  EQUIPMENT_RETURNED:           'equipment.returned',

  // Fuel
  FUEL_RECEIPT_UPLOADED:        'fuel_receipt.uploaded',
  FUEL_RECEIPT_APPROVED:        'fuel_receipt.approved',
  FUEL_RECEIPT_REJECTED:        'fuel_receipt.rejected',

  // Maintenance
  MAINTENANCE_SCHEDULED:        'maintenance.scheduled',
  MAINTENANCE_COMPLETED:        'maintenance.completed',

  // Invoice / payment
  INVOICE_GENERATED:            'invoice.generated',
  INVOICE_APPROVED:             'invoice.approved',   // human approval — AI guardrail
  INVOICE_SENT:                 'invoice.sent',
  PAYMENT_RECEIVED:             'payment.received',
  PAYMENT_RECONCILED:           'payment.reconciled',

  // Expense
  EXPENSE_SUBMITTED:            'expense.submitted',
  EXPENSE_APPROVED:             'expense.approved',   // human approval — AI guardrail
  EXPENSE_PAID:                 'expense.paid',

  // Payroll
  PAYROLL_RUN_PREPARED:         'payroll_run.prepared',
  PAYROLL_RUN_APPROVED:         'payroll_run.approved', // human approval — AI guardrail
  PAYROLL_RUN_PAID:             'payroll_run.paid',     // owner marks paid after bank transfer
} as const;

export type ContractorEventType = typeof CONTRACTOR_EVENTS[keyof typeof CONTRACTOR_EVENTS];

// ── Data shapes (stored in lados_resources.data jsonb) ────────────────────────

// M1 — Operations

export interface JobData {
  customerId?:    string;   // resource ID of type 'customer'
  description?:  string;
  scheduledDate?: string;  // ISO 8601
  siteAddress?:  string;
  tripCount?:    number;
  totalKm?:      number;
}

export interface TripData {
  jobId:          string;   // parent job resource ID
  vehicleId:      string;   // vehicle resource ID
  driverId:       string;   // driver resource ID
  scheduledDate?: string;
  odometerStart?: number;
  odometerEnd?:   number;
  completedKm?:   number;
  notes?:         string;
  completedAt?:   string;
}

export interface FuelReceiptData {
  vehicleId:    string;    // vehicle resource ID
  fileUrl:      string;    // uploaded receipt file
  amount?:      number;    // MYR
  liters?:      number;
  pricePerLiter?: number;
  stationName?: string;
  receiptDate?: string;    // ISO 8601
  // AI-extracted fields (advisory, require human approval before use)
  aiExtracted?: {
    amount?:      number;
    liters?:      number;
