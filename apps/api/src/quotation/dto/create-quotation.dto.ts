export interface QuotationLineItem {
  item_no?: string;
  description: string;
  unit?: string;
  qty?: number | null;
  rate?: number | null;
  amount?: number | null;
}

export class CreateQuotationDto {
  supplier_id!: string;
  trade!: string;
  distribution_id?: string;
  line_items?: QuotationLineItem[];
  total_amount?: number;
  currency?: string;
  validity_days?: number;
  notes?: string;
  status?: 'draft' | 'submitted';
}

export class UpdateQuotationDto {
  line_items?: QuotationLineItem[];
  total_amount?: number;
  validity_days?: number;
  notes?: string;
  status?: 'draft' | 'submitted' | 'evaluated' | 'awarded' | 'rejected';
}
