import { Global, Module } from '@nestjs/common';
import { DocumentService } from './document.service';

/**
 * DocumentModule — Sprint 14 (S14-001)
 *
 * Global so DocumentService can be injected anywhere without
 * importing DocumentModule explicitly.
 */
@Global()
@Module({
  providers: [DocumentService],
  exports:   [DocumentService],
})
export class DocumentModule {}
