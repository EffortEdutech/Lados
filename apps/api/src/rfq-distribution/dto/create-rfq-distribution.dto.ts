/** Single entry in a bulk distribution request */
export class RfqDistributionItemDto {
  supplier_id!: string;
  trade!: string;
  storage_path!: string;
  run_id?: string;
  project_id?: string;
}

/** Bulk-create request — many distributions at once */
export class CreateRfqDistributionsDto {
  items!: RfqDistributionItemDto[];
}

export class UpdateRfqDistributionDto {
  status?: 'pending' | 'sent' | 'acknowledged' | 'declined';
  sent_at?: string;
  supplier_ref?: string;
  notes?: string;
}
