export class CreateSupplierDto {
  name!: string;
  email?: string;
  phone?: string;
  address?: string;
  trades?: string[];
  cidb_grade?: string;
  registration_no?: string;
  notes?: string;
}
