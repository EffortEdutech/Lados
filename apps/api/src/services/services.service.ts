import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class ServicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase.admin
      .from('core_services')
      .select('id, name, description, status, version, sprint_built, sprint_planned, icon')
      .order('name');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('core_services')
      .select('*')
      .eq('id', id)
      .single();

    if (error ?? !data) throw new Error(`Service "${id}" not found`);
    return data;
  }
}
