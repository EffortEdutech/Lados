import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * Global module — SupabaseService is available everywhere
 * without needing to import SupabaseModule in each feature module.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
