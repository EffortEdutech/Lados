import { Module } from '@nestjs/common';
import { RfqDistributionController } from './rfq-distribution.controller';
import { RfqDistributionService } from './rfq-distribution.service';
import { SupabaseModule } from '../common/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [RfqDistributionController],
  providers: [RfqDistributionService],
  exports: [RfqDistributionService],
})
export class RfqDistributionModule {}
