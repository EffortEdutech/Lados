import { Global, Module } from '@nestjs/common';
import { ReligiousSourceService } from './religious-source.service';

/**
 * ReligiousSourceModule — Phase B (QMCP).
 *
 * Global so ReligiousSourceService can be injected anywhere without
 * importing this module explicitly — same convention as DocumentModule.
 * Backs @lados/official-quran-media's IQuranSourceService /
 * IHadithVerificationService via structural typing (see
 * religious-source.service.ts header).
 */
@Global()
@Module({
  providers: [ReligiousSourceService],
  exports: [ReligiousSourceService],
})
export class ReligiousSourceModule {}
