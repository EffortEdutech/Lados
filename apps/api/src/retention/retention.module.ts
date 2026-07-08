import { Module } from '@nestjs/common';
import { RetentionService } from './retention.service'; // Phase 22 S22.5
import { SupabaseModule } from '../common/supabase/supabase.module';

@Module({
  imports:   [SupabaseModule],
  providers: [RetentionService],
})
export class RetentionModule {}
